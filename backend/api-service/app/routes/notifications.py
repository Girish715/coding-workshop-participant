from flask import Blueprint, request, jsonify, g
from app import db
from app.models import Notification
from app.rbac import roles_required
from app.cache import cached, invalidate

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("", methods=["GET"])
@roles_required("admin", "hr", "manager", "employee")
@cached("notifications")
def list_notifications():
    limit = request.args.get("limit", 50, type=int)
    unread_only = request.args.get("unread_only", "false").lower() == "true"

    query = Notification.query.filter_by(user_id=g.current_user.id)
    if unread_only:
        query = query.filter_by(is_read=False)

    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    unread_count = Notification.query.filter_by(user_id=g.current_user.id, is_read=False).count()

    return jsonify({
        "notifications": [n.to_dict() for n in notifications],
        "unread_count": unread_count,
    })


@notifications_bp.route("/<int:notif_id>/read", methods=["PUT"])
@roles_required("admin", "hr", "manager", "employee")
def mark_read(notif_id):
    notif = Notification.query.get_or_404(notif_id)
    if notif.user_id != g.current_user.id:
        return jsonify({"error": "Access denied"}), 403

    notif.is_read = True
    db.session.commit()
    invalidate("notifications")
    return jsonify(notif.to_dict())


@notifications_bp.route("/read-all", methods=["PUT"])
@roles_required("admin", "hr", "manager", "employee")
def mark_all_read():
    Notification.query.filter_by(user_id=g.current_user.id, is_read=False).update({"is_read": True})
    db.session.commit()
    invalidate("notifications")
    return jsonify({"message": "All notifications marked as read"})

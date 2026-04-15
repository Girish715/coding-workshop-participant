from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models import TrainingRecord

training_bp = Blueprint("training", __name__)


@training_bp.route("", methods=["GET"])
@jwt_required()
def list_training():
    employee_id = request.args.get("employee_id", type=int)
    status = request.args.get("status")

    query = TrainingRecord.query
    if employee_id:
        query = query.filter_by(employee_id=employee_id)
    if status:
        query = query.filter_by(status=status)

    records = query.order_by(TrainingRecord.start_date.desc()).all()
    return jsonify([r.to_dict() for r in records])


@training_bp.route("/<int:record_id>", methods=["GET"])
@jwt_required()
def get_training(record_id):
    record = TrainingRecord.query.get_or_404(record_id)
    return jsonify(record.to_dict())


@training_bp.route("", methods=["POST"])
@jwt_required()
def create_training():
    data = request.get_json()
    record = TrainingRecord(
        employee_id=data["employee_id"],
        training_name=data["training_name"],
        provider=data.get("provider"),
        training_type=data["training_type"],
        start_date=data["start_date"],
        end_date=data.get("end_date"),
        status=data.get("status", "enrolled"),
        score=data.get("score"),
        certificate_url=data.get("certificate_url"),
    )
    db.session.add(record)
    db.session.commit()
    return jsonify(record.to_dict()), 201


@training_bp.route("/<int:record_id>", methods=["PUT"])
@jwt_required()
def update_training(record_id):
    record = TrainingRecord.query.get_or_404(record_id)
    data = request.get_json()
    for field in ["training_name", "provider", "training_type", "start_date",
                   "end_date", "status", "score", "certificate_url"]:
        if field in data:
            setattr(record, field, data[field])
    db.session.commit()
    return jsonify(record.to_dict())


@training_bp.route("/<int:record_id>", methods=["DELETE"])
@jwt_required()
def delete_training(record_id):
    record = TrainingRecord.query.get_or_404(record_id)
    db.session.delete(record)
    db.session.commit()
    return jsonify({"message": "Training record deleted"}), 200

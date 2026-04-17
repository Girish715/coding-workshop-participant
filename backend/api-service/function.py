"""
Lambda Function URL handler that wraps the Flask WSGI application.
Converts Lambda Function URL events into WSGI environ and returns
proper Lambda response objects.
"""

import io
import json
import base64
import logging
from app import create_app

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create Flask app once (reused across warm invocations)
flask_app = create_app()


def handler(event=None, context=None):
    """
    AWS Lambda handler for Function URL invocations.
    Translates Lambda event → WSGI → Flask → Lambda response.
    """
    logger.debug("Received event: %s", json.dumps(event or {}))

    try:
        rc = event.get("requestContext", {}).get("http", {})
        method = rc.get("method", "GET")
        path = rc.get("path", "/")

        # CloudFront forwards /api/api-service/* to this function unchanged.
        # Normalize that prefix back to /api/* so Flask routes continue to match.
        if path == "/api/api-service":
            path = "/api"
        elif path.startswith("/api/api-service/"):
            path = "/api/" + path[len("/api/api-service/"):]

        headers = event.get("headers", {})
        qs = event.get("queryStringParameters") or {}
        raw_body = event.get("body", "") or ""
        is_base64 = event.get("isBase64Encoded", False)

        if is_base64 and raw_body:
            body = base64.b64decode(raw_body)
        elif raw_body:
            body = raw_body.encode("utf-8")
        else:
            body = b""

        query_string = "&".join(f"{k}={v}" for k, v in qs.items()) if qs else ""

        # Build WSGI environ
        environ = {
            "REQUEST_METHOD": method,
            "PATH_INFO": path,
            "QUERY_STRING": query_string,
            "SERVER_NAME": "lambda",
            "SERVER_PORT": "443",
            "HTTP_HOST": headers.get("host", "lambda"),
            "SERVER_PROTOCOL": "HTTP/1.1",
            "wsgi.version": (1, 0),
            "wsgi.url_scheme": "https",
            "wsgi.input": io.BytesIO(body),
            "wsgi.errors": io.BytesIO(),
            "wsgi.multithread": False,
            "wsgi.multiprocess": False,
            "wsgi.run_once": False,
            "CONTENT_TYPE": headers.get("content-type", ""),
            "CONTENT_LENGTH": str(len(body)),
        }

        # Map HTTP headers to WSGI format
        for key, value in headers.items():
            wsgi_key = f"HTTP_{key.upper().replace('-', '_')}"
            if wsgi_key not in ("HTTP_CONTENT_TYPE", "HTTP_CONTENT_LENGTH"):
                environ[wsgi_key] = value

        # Invoke Flask WSGI app
        response_started = []
        response_body = []

        def start_response(status, response_headers, exc_info=None):
            response_started.append((status, response_headers))

        result = flask_app(environ, start_response)
        for data in result:
            response_body.append(data)
        if hasattr(result, "close"):
            result.close()

        status_code = int(response_started[0][0].split(" ")[0])
        resp_headers = {k: v for k, v in response_started[0][1]}
        body_bytes = b"".join(response_body)

        return {
            "statusCode": status_code,
            "headers": resp_headers,
            "body": body_bytes.decode("utf-8"),
        }

    except Exception as e:
        logger.error("Handler error: %s", str(e), exc_info=True)
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Internal server error", "message": str(e)}),
        }


# Local testing
if __name__ == "__main__":
    # Simulate a GET /api/auth/me event
    test_event = {
        "requestContext": {"http": {"method": "GET", "path": "/api/dashboard/stats"}},
        "headers": {"content-type": "application/json"},
        "queryStringParameters": {},
    }
    print(handler(test_event))

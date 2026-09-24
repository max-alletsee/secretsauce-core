from typing import Any


class SecretSauceError(Exception):
    code: str = "internal_error"
    status_code: int = 500

    def __init__(
        self,
        message: str = "An internal error occurred",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.details = details

    def to_dict(self) -> dict[str, Any]:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details,
            }
        }


class ConflictError(SecretSauceError):
    code = "conflict"
    status_code = 409

    def __init__(
        self,
        message: str = "Resource conflict",
        current: dict[str, Any] | None = None,
        details: dict[str, Any] | None = None,
    ):
        merged_details = details or {}
        if current is not None:
            merged_details["current"] = current
        super().__init__(message=message, details=merged_details or None)


class NotFoundError(SecretSauceError):
    code = "not_found"
    status_code = 404

    def __init__(
        self,
        message: str = "Resource not found",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message=message, details=details)


class ValidationError(SecretSauceError):
    code = "validation"
    status_code = 422

    def __init__(
        self,
        message: str = "Validation failed",
        fields: dict[str, str] | None = None,
        details: dict[str, Any] | None = None,
    ):
        merged_details = dict(details) if details else {}
        if fields is not None:
            merged_details["fields"] = fields
        super().__init__(message=message, details=merged_details or None)


class VetoError(SecretSauceError):
    code = "veto"
    status_code = 422

    def __init__(
        self,
        message: str = "Operation vetoed by policy hook",
        plugin_id: str | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.plugin_id = plugin_id
        merged_details = dict(details) if details else {}
        if plugin_id is not None:
            merged_details["plugin_id"] = plugin_id
        super().__init__(message=message, details=merged_details or None)


class SetupRequiredError(SecretSauceError):
    code = "setup_required"
    status_code = 409

    def __init__(
        self,
        message: str = "Household setup is required",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message=message, details=details)


class UnauthorizedError(SecretSauceError):
    code = "unauthorized"
    status_code = 401

    def __init__(
        self,
        message: str = "Authentication required",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message=message, details=details)


class ForbiddenError(SecretSauceError):
    code = "forbidden"
    status_code = 403

    def __init__(
        self,
        message: str = "Access forbidden",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message=message, details=details)


class PayloadTooLargeError(SecretSauceError):
    code = "payload_too_large"
    status_code = 413

    def __init__(
        self,
        message: str = "Payload exceeds maximum allowed size",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message=message, details=details)


class TooManyRequestsError(SecretSauceError):
    code = "too_many_requests"
    status_code = 429

    def __init__(
        self,
        message: str = "Too many requests",
        retry_after: int | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.retry_after = retry_after
        merged_details = dict(details) if details else {}
        if retry_after is not None:
            merged_details["retry_after"] = retry_after
        super().__init__(message=message, details=merged_details or None)


class PluginRuntimeError(SecretSauceError):
    code = "plugin_error"
    status_code = 500

    def __init__(
        self,
        message: str = "Plugin encountered an unhandled error",
        plugin_id: str | None = None,
        details: dict[str, Any] | None = None,
    ):
        merged_details = dict(details) if details else {}
        if plugin_id is not None:
            merged_details["plugin_id"] = plugin_id
        super().__init__(message=message, details=merged_details or None)


# Alias for backward/spec convenience
PluginError = PluginRuntimeError


_STATUS_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "payload_too_large",
    422: "validation",
    429: "too_many_requests",
    503: "unavailable",
}


def error_body(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    """The one error envelope every API response uses (spec Appendix A.1)."""
    return {"error": {"code": code, "message": message, "details": details}}


def code_for_status(status_code: int) -> str:
    return _STATUS_CODES.get(status_code, "internal_error" if status_code >= 500 else "error")

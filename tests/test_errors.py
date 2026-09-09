import pytest
from secretsauce.errors import (
    SecretSauceError,
    NotFoundError,
    ConflictError,
    ValidationError,
    VetoError,
    SetupRequiredError,
    UnauthorizedError,
    ForbiddenError,
    PayloadTooLargeError,
    PluginRuntimeError,
)

def test_conflict_error_payload():
    err = ConflictError(message="Revision mismatch", current={"id": "1", "revision": 2})
    assert err.code == "conflict"
    assert err.status_code == 409
    assert err.to_dict() == {
        "error": {
            "code": "conflict",
            "message": "Revision mismatch",
            "details": {"current": {"id": "1", "revision": 2}},
        }
    }

def test_not_found_error_payload():
    err = NotFoundError("Recipe not found")
    assert err.code == "not_found"
    assert err.status_code == 404
    assert err.to_dict() == {
        "error": {
            "code": "not_found",
            "message": "Recipe not found",
            "details": None,
        }
    }

def test_validation_error_payload():
    err = ValidationError("Invalid fields", fields={"title": "Title is required"})
    assert err.code == "validation"
    assert err.status_code == 422
    assert err.to_dict() == {
        "error": {
            "code": "validation",
            "message": "Invalid fields",
            "details": {"fields": {"title": "Title is required"}},
        }
    }

def test_veto_error_payload():
    err = VetoError("Action vetoed", plugin_id="allergen-checker")
    assert err.code == "veto"
    assert err.status_code == 422
    assert err.to_dict() == {
        "error": {
            "code": "veto",
            "message": "Action vetoed",
            "details": {"plugin_id": "allergen-checker"},
        }
    }

def test_setup_required_error_payload():
    err = SetupRequiredError()
    assert err.code == "setup_required"
    assert err.status_code == 409
    assert err.to_dict() == {
        "error": {
            "code": "setup_required",
            "message": "Household setup is required",
            "details": None,
        }
    }

def test_unauthorized_error_payload():
    err = UnauthorizedError()
    assert err.code == "unauthorized"
    assert err.status_code == 401
    assert err.to_dict()["error"]["code"] == "unauthorized"

def test_forbidden_error_payload():
    err = ForbiddenError()
    assert err.code == "forbidden"
    assert err.status_code == 403
    assert err.to_dict()["error"]["code"] == "forbidden"

def test_payload_too_large_error_payload():
    err = PayloadTooLargeError()
    assert err.code == "payload_too_large"
    assert err.status_code == 413
    assert err.to_dict()["error"]["code"] == "payload_too_large"

def test_plugin_runtime_error_payload():
    err = PluginRuntimeError("Plugin crashed", plugin_id="my-plugin")
    assert err.code == "plugin_error"
    assert err.status_code == 500
    assert err.to_dict() == {
        "error": {
            "code": "plugin_error",
            "message": "Plugin crashed",
            "details": {"plugin_id": "my-plugin"},
        }
    }

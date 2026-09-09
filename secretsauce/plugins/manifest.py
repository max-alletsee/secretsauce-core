from dataclasses import asdict, dataclass
import re
from typing import Any

from secretsauce.errors import ValidationError

ID_PATTERN = re.compile(r"^[a-z][a-z0-9-]{1,40}$")
SEMVER_PATTERN = re.compile(
    r"^(?P<major>0|[1-9]\d*)\.(?P<minor>0|[1-9]\d*)\.(?P<patch>0|[1-9]\d*)"
    r"(?:-(?P<prerelease>[0-9A-Za-z.-]+))?"
    r"(?:\+(?P<buildmetadata>[0-9A-Za-z.-]+))?$"
)


@dataclass
class PluginManifest:
    id: str
    version: str
    name: str
    description: str = ""
    schema: int = 0
    requires: list[str] | None = None
    ui: str | None = None
    ui_css: str | None = None
    ui_api: int = 1
    config_schema: dict[str, Any] | None = None

    def __post_init__(self):
        if self.requires is None:
            self.requires = []

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def validate_manifest(
    raw: dict[str, Any], expected_id: str | None = None
) -> PluginManifest:
    if not isinstance(raw, dict):
        raise ValidationError("PLUGIN manifest must be a dictionary")

    plugin_id = raw.get("id")
    if not plugin_id or not isinstance(plugin_id, str):
        raise ValidationError("Plugin manifest must contain a non-empty string 'id'")

    if not ID_PATTERN.match(plugin_id):
        raise ValidationError(
            f"Plugin id '{plugin_id}' must match pattern ^[a-z][a-z0-9-]{{1,40}}$"
        )

    if expected_id is not None and plugin_id != expected_id:
        raise ValidationError(
            f"Plugin id '{plugin_id}' does not match directory/file name '{expected_id}'"
        )

    version = raw.get("version")
    if not version or not isinstance(version, str):
        raise ValidationError(
            "Plugin manifest must contain a non-empty string 'version'"
        )

    if not SEMVER_PATTERN.match(version):
        raise ValidationError(
            f"Plugin version '{version}' is not valid semantic versioning"
        )

    name = raw.get("name", plugin_id)
    if not isinstance(name, str):
        raise ValidationError("Plugin name must be a string")

    description = raw.get("description", "")
    if not isinstance(description, str):
        raise ValidationError("Plugin description must be a string")

    schema = raw.get("schema", 0)
    if not isinstance(schema, int) or schema < 0:
        raise ValidationError("Plugin schema must be a non-negative integer")

    requires = raw.get("requires", [])
    if not isinstance(requires, list) or not all(
        isinstance(item, str) for item in requires
    ):
        raise ValidationError("Plugin requires must be a list of strings")

    ui = raw.get("ui")
    if ui is not None and not isinstance(ui, str):
        raise ValidationError("Plugin ui must be a string or None")

    ui_css = raw.get("ui_css")
    if ui_css is not None and not isinstance(ui_css, str):
        raise ValidationError("Plugin ui_css must be a string or None")

    ui_api = raw.get("ui_api", 1)
    if not isinstance(ui_api, int):
        raise ValidationError("Plugin ui_api must be an integer")

    config_schema = raw.get("config_schema")
    if config_schema is not None and not isinstance(config_schema, dict):
        raise ValidationError("Plugin config_schema must be a dict or None")

    return PluginManifest(
        id=plugin_id,
        version=version,
        name=name,
        description=description,
        schema=schema,
        requires=list(requires),
        ui=ui,
        ui_css=ui_css,
        ui_api=ui_api,
        config_schema=config_schema,
    )

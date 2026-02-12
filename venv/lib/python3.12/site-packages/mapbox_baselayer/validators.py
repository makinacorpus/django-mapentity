from django.core.exceptions import ValidationError


def validate_required_token_in_tile_url(value):
    """Validate that the tile URL contains required tokens for Mapbox style URLs."""
    required_tokens = ["{z}", "{x}", "{y}"]
    for token in required_tokens:
        if token not in value:
            msg = f"Tile URL must contain required tokens: {', '.join(required_tokens)}"
            raise ValidationError(msg)


def validate_only_required_tokens_in_tile_url(value):
    """Validate that the tile URL contains only the required tokens for Mapbox style URLs."""
    allowed_tokens = ["{z}", "{x}", "{y}"]
    bad_tokens_in_value = []
    for chunk in value.split("{"):
        if "}" in chunk:
            token_name = chunk.split("}", 1)[0]
            full_token = "{" + token_name + "}"
            if full_token not in allowed_tokens and full_token != "{a}":
                bad_tokens_in_value.append(full_token)
    if "{a}" in value:
        msg = "Tile URL cannot contain the '{a}' token, which is not supported for Style URLs. Please add 3 URLs (a, b and c) instead of only once with '{a}'."
        raise ValidationError(msg)
    elif bad_tokens_in_value:
        msg = f"Tile URL contains unsupported tokens: {', '.join(bad_tokens_in_value)}. Only {', '.join(allowed_tokens)} are allowed for Style URLs."
        raise ValidationError(msg)

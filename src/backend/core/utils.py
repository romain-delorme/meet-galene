"""
Utils functions used in the core app
"""

# pylint: disable=R0913, R0917
# ruff: noqa:S311, PLR0913

import hashlib
import json
import logging
import mimetypes
import random
import secrets
import string
from typing import List, Optional
from uuid import uuid4

from django.conf import settings
from django.core.files.storage import default_storage

import aiohttp
import boto3
import botocore
import magic
from asgiref.sync import async_to_sync
from galene.api import (
    AccessToken,
    VideoGrants,
    GaleneAPI,
    GaleneError,
    GroupDefinition
)

logger = logging.getLogger(__name__)


def generate_color(identity: str) -> str:
    """Generates a consistent HSL color based on a given identity string.

    The function seeds the random generator with the identity's hash,
    ensuring consistent color output. The HSL format allows fine-tuned control
    over saturation and lightness, empirically adjusted to produce visually
    appealing and distinct colors. HSL is preferred over hex to constrain the color
    range and ensure predictability.
    """

    # ruff: noqa:S324
    identity_hash = hashlib.sha1(identity.encode("utf-8"))
    # Keep only hash's last 16 bits, collisions are not a concern
    seed = int(identity_hash.hexdigest(), 16) & 0xFFFF
    random.seed(seed)
    hue = random.randint(0, 360)
    saturation = random.randint(50, 75)
    lightness = random.randint(25, 60)

    return f"hsl({hue}, {saturation}%, {lightness}%)"



def generate_token(
    room: str,
    permissions: List[str],
    username: Optional[str] = None,
) -> str:

    video_grants = VideoGrants(
        room=room,
        permissions = permissions
    )

    identity = username
    key = settings.GALENE_CONFIGURATION["token key for jwt"]
    # Later we will need to make a real key
    server = settings.GALENE_CONFIGURATION["url"]

    token = AccessToken(key, server).with_identity(identity).add_grant(video_grants) 
    return token.to_jwt()

def generate_galene_config(
    room_id: str,
    username: str,
    permissions: List[str]
) -> dict:

    return {
        "url": settings.GALENE_CONFIGURATION["url"],
        "room": room_id,
        "token": generate_token(
            room=room_id,
            permissions= permissions,
            username=username,
        ),
    }


def generate_s3_authorization_headers(key):
    """
    Generate authorization headers for an s3 object.
    These headers can be used as an alternative to signed urls with many benefits:
    - the urls of our files never expire and can be stored in our recording' metadata
    - we don't leak authorized urls that could be shared (file access can only be done
      with cookies)
    - access control is truly realtime
    - the object storage service does not need to be exposed on internet
    """

    url = default_storage.unsigned_connection.meta.client.generate_presigned_url(
        "get_object",
        ExpiresIn=0,
        Params={"Bucket": default_storage.bucket_name, "Key": key},
    )

    request = botocore.awsrequest.AWSRequest(method="get", url=url)

    s3_client = default_storage.connection.meta.client
    # pylint: disable=protected-access
    credentials = s3_client._request_signer._credentials  # noqa: SLF001
    frozen_credentials = credentials.get_frozen_credentials()
    region = s3_client.meta.region_name
    auth = botocore.auth.S3SigV4Auth(frozen_credentials, "s3", region)
    auth.add_auth(request)

    return request

def create_galene_client():
    '''Create and return a configured Galene API client.'''
    server_url = settings.GALENE_CONFIGURATION["url"]
    print(server_url, settings.GALENE_CONFIGURATION["api_admin_login"], settings.GALENE_CONFIGURATION["api_admin_password"])
    return GaleneAPI(server_url, username=settings.GALENE_CONFIGURATION["api_admin_login"], password=settings.GALENE_CONFIGURATION["api_admin_password"])




class NotificationError(Exception):
    """Notification delivery to room participants fails."""



class MetadataUpdateException(Exception):
    """Room's metadata update fails."""

@async_to_sync
async def update_room_metadata(
    group_name: str, changes: dict = None
):
    '''Update Galene room metadata by merging new values with existing metadata.

    Args:
        room_name: Name of the room to update
        metadata: Dictionary of metadata key-values to add/update
    '''

    galene_api = create_galene_client()

    try:
        groups = await galene_api.groups.list_groups()
        if group_name not in groups:
            raise MetadataUpdateException(
                f"Room {group_name} not found"
            )

        group, etag = await galene_api.groups.get_group(groupname=group_name)
        existing_config = group.model_dump(exclude_unset=True)
        updated_config = {**existing_config, **changes}
        
        await galene_api.groups.update_group(groupname=group_name, definition= GroupDefinition.model_validate(updated_config),etag=etag)
    except GaleneError as e:
        raise MetadataUpdateException(
            f"Failed to update metadata for room {group_name}: {e}"
        ) from e
    finally:
        await galene_api.aclose()



ALPHANUMERIC_CHARSET = string.ascii_letters + string.digits


def generate_secure_token(length: int = 30, charset: str = ALPHANUMERIC_CHARSET) -> str:
    """Generate a cryptographically secure random token.

    Uses SystemRandom for proper entropy, suitable for OAuth tokens
    and API credentials that must be non-guessable.

    Inspired by: https://github.com/oauthlib/oauthlib/blob/master/oauthlib/common.py

    Args:
        length: Token length in characters (default: 30)
        charset: Character set to use for generation

    Returns:
        Cryptographically secure random token
    """
    return "".join(secrets.choice(charset) for _ in range(length))


def generate_client_id() -> str:
    """Generate a unique client ID for application authentication.

    Returns:
        Random client ID string
    """
    return generate_secure_token(settings.APPLICATION_CLIENT_ID_LENGTH)


def generate_client_secret() -> str:
    """Generate a secure client secret for application authentication.

    Returns:
        Cryptographically secure client secret
    """
    return generate_secure_token(settings.APPLICATION_CLIENT_SECRET_LENGTH)


def generate_room_slug():
    """Generate a random room slug in the format 'xxx-xxxx-xxx'."""

    sizes = [3, 4, 3]
    parts = [
        "".join(secrets.choice(string.ascii_lowercase) for _ in range(size))
        for size in sizes
    ]
    return "-".join(parts)


def detect_mimetype(file_buffer: bytes, filename: str | None = None) -> str:
    """
    Detect MIME type using multiple methods for better accuracy.

    This function combines:
    1. Magic bytes detection (python-magic) - most reliable for actual file content
    2. File extension detection (mimetypes) - useful as fallback or for validation

    Args:
        file_buffer: The file content buffer (first bytes of the file)
        filename: Optional filename to extract extension from

    Returns:
        str: The detected MIME type

    Notes:
        Originally from https://github.com/suitenumerique/drive/blob/564822d31f071c6dfacd112ef4b7146c73077cd9/src/backend/core/api/utils.py#L166 # pylint:disable=line-too-long
    """
    # Initialize magic detector
    mime_detector = magic.Magic(mime=True)

    # Method 1: Detect from file content (magic bytes) - most reliable
    mimetype_from_content = mime_detector.from_buffer(file_buffer)

    # If we have a filename, try extension-based detection as well
    mimetype_from_extension = None
    if filename:
        # Use mimetypes module to guess from extension
        # Use guess_file_type (Python 3.13+) instead of deprecated guess_type
        mimetype_from_extension, _ = mimetypes.guess_file_type(filename, strict=False)

    logger.debug("detect_mimetype: mimetype_from_content: %s", mimetype_from_content)
    logger.debug(
        "detect_mimetype: mimetype_from_extension: %s", mimetype_from_extension
    )

    # Strategy: Prefer content-based detection, but use extension if:
    # 1. Content detection returns generic types (application/octet-stream, text/plain)
    # 2. Content detection fails or returns None
    # 3. Extension detection provides a more specific type

    # Generic/unreliable MIME types that we should try to improve
    generic_types = {
        "application/octet-stream",
        "application/x-ole-storage",  # used by .xls, .doc and .ppt
        "application/zip",
        "text/plain",
    }

    # If content detection gives us a generic type and we have extension info
    if mimetype_from_content in generic_types and mimetype_from_extension:
        # Use extension-based detection if it's more specific
        if mimetype_from_extension not in generic_types:
            return mimetype_from_extension

    # If content detection failed, returned None or is a generic type, use extension if available
    if not mimetype_from_content or mimetype_from_content in generic_types:
        if mimetype_from_extension:
            return mimetype_from_extension

    # Default to content-based detection (most reliable)
    return mimetype_from_content or "application/octet-stream"


def generate_upload_policy(file):
    """
    Generate a S3 upload policy for a given file.

    Notes:
        Originally taken from https://github.com/suitenumerique/drive/blob/564822d31f071c6dfacd112ef4b7146c73077cd9/src/backend/core/api/utils.py#L102  # pylint: disable=line-too-long
    """

    key = file.file_key

    # This settings should be used if the backend application and the frontend application
    # can't connect to the object storage with the same domain. This is the case in the
    # docker compose stack used in development. The frontend application will use localhost
    # to connect to the object storage while the backend application will use the object storage
    # service name declared in the docker compose stack.
    # This is needed because the domain name is used to compute the signature. So it can't be
    # changed dynamically by the frontend application.
    if settings.AWS_S3_DOMAIN_REPLACE:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_S3_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_S3_SECRET_ACCESS_KEY,
            endpoint_url=settings.AWS_S3_DOMAIN_REPLACE,
            config=botocore.client.Config(
                region_name=settings.AWS_S3_REGION_NAME,
                signature_version=settings.AWS_S3_SIGNATURE_VERSION,
            ),
        )
    else:
        s3_client = default_storage.connection.meta.client

    # Generate the policy
    policy = s3_client.generate_presigned_url(
        ClientMethod="put_object",
        Params={"Bucket": default_storage.bucket_name, "Key": key, "ACL": "private"},
        ExpiresIn=settings.AWS_S3_UPLOAD_POLICY_EXPIRATION,
    )

    return policy

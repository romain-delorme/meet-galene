"""Participants management service for Galene rooms."""

# pylint: disable=too-many-arguments,no-name-in-module,too-many-positional-arguments
# ruff: noqa:PLR0913
from typing import List
import json
import uuid
from logging import getLogger
from typing import Dict, Optional
from asgiref.sync import async_to_sync
from core.utils import create_galene_client
from galene.api import (
    UserDefinition,
    GaleneError
)
"""
from livekit.api import (
    MuteRoomTrackRequest,
    RoomParticipantIdentity,
    TwirpError,
    UpdateParticipantRequest,
)
"""
from core import utils

from .lobby import LobbyService

logger = getLogger(__name__)


class ParticipantsManagementException(Exception):
    """Exception raised when a participant management operations fail."""


class ParticipantNotFoundException(ParticipantsManagementException):
    """Raised when the target participant does not exist in the room."""


class ParticipantsManagement:
    """Service for managing participants."""

    @async_to_sync 
    async def mute(self, room_name: str, identity: str, track_sid: str):
        pass

    @async_to_sync
    async def add(self, group_name: str, username: str, permissions: List[str], password: Optional[str] = "password"):
        galene_api = create_galene_client()
        groups = await galene_api.groups.list_groups()
        if group_name not in groups:
            raise ParticipantsManagementException("Group does not exist")
        users = await galene_api.users.list_users(groupname=group_name)
        if username in users:
            raise ParticipantsManagementException("User already exists")
        user_definition = UserDefinition.model_validate({"permissions": permissions})
        try:
            await galene_api.users.update_user(groupname=group_name, username=username, definition=user_definition)
        except GaleneError as e:
            raise ParticipantsManagementException("Could not add user") from e
        finally:
            await galene_api.aclose()
    
    @async_to_sync 
    async def remove(self, room_name: str, identity: str):
        galene_api = create_galene_client()
        groups = await galene_api.groups.list_groups()
        if room_name not in groups:
            raise ParticipantsManagementException("Group does not exist")
        users = await galene_api.users.list_users(groupname=room_name)
        if identity not in users:
            raise ParticipantNotFoundException("User does not exist")
        try:
            await galene_api.users.delete_user(groupname=room_name, username=identity)
        except GaleneError as e:
            raise ParticipantsManagementException("Could not delete user") from e
        finally:
            await galene_api.aclose()
    
    @async_to_sync
    async def update(self, room_name: str, identity: str, changes: Dict):
        galene_api = create_galene_client()
        groups = await galene_api.groups.list_groups()
        if room_name not in groups:
            raise ParticipantsManagementException("Group does not exist")
        users = await galene_api.users.list_users(groupname=room_name)
        if identity not in users:
            raise ParticipantNotFoundException("User does not exist")
        try:
            user = await galene_api.users.get_user(groupname=room_name, username=identity)
            existing_config = user.model_dump(exclude_unset=True)
            updated_config = {**existing_config, **changes}
            await galene_api.users.update_user(groupname=room_name, username=identity, definition=UserDefinition.model_validate(updated_config))
        except GaleneError as e:
            raise ParticipantsManagementException(f"Failed to update user : {e}") from e
        finally:
            await galene_api.aclose()
    


    """
    @async_to_sync
    async def mute(self, room_name: str, identity: str, track_sid: str):
        '''Mute a specific audio or video track for a participant in a room.'''

        lkapi = utils.create_livekit_client()
        
        try:
            await lkapi.room.mute_published_track(
                MuteRoomTrackRequest(
                    room=room_name,
                    identity=identity,
                    track_sid=track_sid,
                    muted=True,
                )
            )

        except TwirpError as e:
            if e.code == "not_found":
                logger.warning(
                    "Participant %s not found in room %s, skipping muting",
                    identity,
                    room_name,
                )
                raise ParticipantNotFoundException("Participant does not exist") from e

            logger.exception(
                "Unexpected error muting participant %s for room %s",
                identity,
                room_name,
            )
            raise ParticipantsManagementException("Could not mute participant") from e

        finally:
            await lkapi.aclose()

    @async_to_sync
    async def remove(self, room_name: str, identity: str):
        '''Remove a participant from a room and clear their lobby cache.'''

        try:
            LobbyService().clear_participant_cache(
                room_id=uuid.UUID(room_name), participant_id=identity
            )
        except (ValueError, TypeError) as exc:
            logger.warning(
                "participants_management.remove: room_name '%s' is not a UUID; "
                "skipping lobby cache clear",
                room_name,
                exc_info=exc,
            )

        lkapi = utils.create_livekit_client()

        try:
            await lkapi.room.remove_participant(
                RoomParticipantIdentity(room=room_name, identity=identity)
            )
        except TwirpError as e:
            if e.code == "not_found":
                logger.warning(
                    "Participant %s not found in room %s, skipping removing",
                    identity,
                    room_name,
                )
                raise ParticipantNotFoundException("Participant does not exist") from e

            logger.exception(
                "Unexpected error removing participant %s for room %s",
                identity,
                room_name,
            )
            raise ParticipantsManagementException("Could not remove participant") from e

        finally:
            await lkapi.aclose()

    @async_to_sync
    async def update(
        self,
        room_name: str,
        identity: str,
        metadata: Optional[Dict] = None,
        attributes: Optional[Dict] = None,
        permission: Optional[Dict] = None,
        name: Optional[str] = None,
    ):
        '''Update participant properties such as metadata, attributes, permissions, or name.'''

        lkapi = utils.create_livekit_client()

        try:
            await lkapi.room.update_participant(
                UpdateParticipantRequest(
                    room=room_name,
                    identity=identity,
                    metadata=json.dumps(metadata),
                    permission=permission,
                    attributes=attributes,
                    name=name,
                )
            )

        except TwirpError as e:
            if e.code == "not_found":
                logger.warning(
                    "Participant %s not found in room %s, skipping update",
                    identity,
                    room_name,
                )
                raise ParticipantNotFoundException("Participant does not exist") from e

            logger.exception(
                "Unexpected error updating participant %s for room %s",
                identity,
                room_name,
            )
            raise ParticipantsManagementException("Could not update participant") from e

        finally:
            await lkapi.aclose()
    """

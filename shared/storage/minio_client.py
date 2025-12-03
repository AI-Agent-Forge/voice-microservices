from minio import Minio
from shared.config.loader import shared_settings


def _strip_scheme(endpoint: str) -> str:
    if endpoint.startswith("http://"):
        return endpoint[len("http://") :]
    if endpoint.startswith("https://"):
        return endpoint[len("https://") :]
    return endpoint


client = Minio(
    endpoint=_strip_scheme(shared_settings.MINIO_ENDPOINT),
    access_key=shared_settings.MINIO_ROOT_USER,
    secret_key=shared_settings.MINIO_ROOT_PASSWORD,
    secure=False,
)


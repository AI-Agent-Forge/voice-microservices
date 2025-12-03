from alembic import op
import sqlalchemy as sa
from uuid import uuid4
import json


revision = "0002_seed_sample"
down_revision = "0001_init_schema"
branch_labels = None
depends_on = None


def upgrade():
    task_id = str(uuid4())
    op.execute(
        sa.text(
            "INSERT INTO tasks (id, status, audio_uri, created_at, updated_at) VALUES (:id, :status, :audio_uri, NOW(), NOW())"
        ).bindparams(id=task_id, status="seeded", audio_uri="s3://audio/sample.wav")
    )

    metadata = {
        "task_id": task_id,
        "asr": {"transcript": "Hello world", "words": []},
    }
    op.execute(
        sa.text(
            "INSERT INTO artifacts (id, task_id, type, uri, metadata, created_at) VALUES (:id, :task_id, :type, :uri, CAST(:metadata AS JSONB), NOW())"
        ).bindparams(
            id=str(uuid4()),
            task_id=task_id,
            type="seed",
            uri="",
            metadata=json.dumps(metadata),
        )
    )

    payload = {"overall_summary": "Seed feedback", "issues": [], "drills": {}}
    op.execute(
        sa.text(
            "INSERT INTO feedback (id, task_id, payload, created_at) VALUES (:id, :task_id, CAST(:payload AS JSONB), NOW())"
        ).bindparams(
            id=str(uuid4()), task_id=task_id, payload=json.dumps(payload)
        )
    )


def downgrade():
    op.execute(sa.text("DELETE FROM feedback WHERE payload->>'overall_summary' = 'Seed feedback'"))
    op.execute(sa.text("DELETE FROM artifacts WHERE type = 'seed'"))
    op.execute(sa.text("DELETE FROM tasks WHERE status = 'seeded'"))

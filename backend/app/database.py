from supabase import create_client, Client
from app.config import settings

# Service-role client: bypasses RLS, used only for trusted server-side writes
# (e.g. deducting credits, inserting messages on the user's behalf after
# we've already verified their JWT ourselves).
supabase_admin: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY,
)


def get_user_client(user_jwt: str) -> Client:
    """
    Client scoped to the requesting user's JWT, so RLS policies apply.
    Use this for anything that should respect row-level security instead
    of the admin client.
    """
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.postgrest.auth(user_jwt)
    return client

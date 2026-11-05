# Approved assessment reviewers — November 5, 2026

The owner requested that these nine people receive the same access as Sarah Schiff:

| Name | Existing roster email |
| --- | --- |
| Jessica Giannetto | jessica.giannetto@vca.com |
| Kelley Harpin | kelley.harpin@vca.com |
| Amber Koch | amber.koch@vca.com |
| Marissa Marinaccio | marissa.marinaccio@vca.com |
| Dianne Kittrell | dianne.kittrell@vca.com |
| Dawn Nolte | dawn.nolte@vca.com |
| Kate Taikowski | kate.taikowski@vca.com |
| Shaylan Meyer | shaylan.meyer@vca.com |
| Michael McCann | michael.mccann@vca.com |

Their email mappings are taken from the existing SGVP assessment roster.

## Access and activation

The existing Sarah enrollment mechanism now includes these exact addresses. A
successful normal Firebase sign-in at `/sgvp/assessment/#mine` can create only
the user's own UID membership with `active: true`, `tenant_id: shoreline`,
`role: reviewer`, `kura_owner: false`, and `review_manager: false`.

This permits reading review rounds and completing reviews assigned to the
signed-in email. It does not assign reviews, grant review-management authority,
or grant access to Treatment Sheets, patient visits, or other staff modules.

Existing valid memberships are preserved. Disabled, foreign-tenant, or otherwise
restricted memberships cannot be overwritten by the client. Existing account
credentials are unchanged. As with Sarah, a password session or verified email
is required; an unverified non-password session cannot enroll. The existing
server-side enrollment deadline remains November 16, 2026 UTC. Memberships
already created remain valid after that date.

## Release validation

Client tests cover all nine identities, existing membership reuse, unverified
Google-provider denial, and disabled membership preservation. Firestore emulator
tests additionally verify the exact role, own-UID restriction, assigned-review
queries, denial of clinical access, and denial of privilege escalation.

The publication workflow has a one-time main-branch trigger limited to this new
release note. After verifying Firebase publication, restore its manual-only
trigger. Live account activation is confirmed only after each user signs in;
deployment alone does not prove that their UID document has been created.

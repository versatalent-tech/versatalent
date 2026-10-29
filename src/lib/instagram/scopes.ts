/**
 * The only permissions the site ever asks Instagram for. This list is the
 * whole of what a connected account shares with us:
 *
 *   instagram_business_basic            username, profile picture, follower and
 *                                       post counts, and the account's posts
 *   instagram_business_manage_insights  the figures for those posts (views,
 *                                       reach, likes, saves, shares…)
 *
 * Never add messaging (instagram_business_manage_messages), comment
 * (instagram_business_manage_comments) or publishing permissions: talents
 * were promised we can't see or touch their messages. A test fails if this
 * list changes (e2e/tests/instagram-connect.spec.ts).
 */
export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_manage_insights'] as const;

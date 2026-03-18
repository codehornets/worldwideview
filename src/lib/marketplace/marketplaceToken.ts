import { SignJWT, jwtVerify } from "jose";

const SCOPE = "marketplace";
const ISSUER = "worldwideview";
const AUDIENCE = "worldwideview-marketplace";
const EXPIRY = "7d";

function getSecret(): Uint8Array {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET is not set");
    return new TextEncoder().encode(secret);
}

/**
 * Issue a JWT scoped to marketplace API access, bound to a specific user.
 * Signed with AUTH_SECRET — no database required.
 */
export async function issueMarketplaceToken(userId: string): Promise<string> {
    return new SignJWT({ scope: SCOPE })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(userId)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(EXPIRY)
        .sign(getSecret());
}

export interface MarketplaceTokenPayload {
    scope: string;
    sub: string;
    iss: string;
    aud: string;
    iat: number;
    exp: number;
}

/**
 * Verify a marketplace JWT. Throws if invalid, expired, wrong scope,
 * or missing required claims (sub, iss, aud).
 */
export async function verifyMarketplaceToken(
    token: string,
): Promise<MarketplaceTokenPayload> {
    const { payload } = await jwtVerify(token, getSecret(), {
        issuer: ISSUER,
        audience: AUDIENCE,
    });
    if (payload.scope !== SCOPE) {
        throw new Error("Token scope mismatch");
    }
    if (!payload.sub) {
        throw new Error("Token missing subject");
    }
    return payload as unknown as MarketplaceTokenPayload;
}

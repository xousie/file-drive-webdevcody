import { ConvexError, v } from "convex/values";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { getUser } from "./users";

export const createFile = mutation({
  args: {
    name: v.string(),
    orgId: v.string(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError("You must be Logged In to upload a file");
    }

    const hasAccess = await hasAccessToOrg(ctx, identity.tokenIdentifier, args.orgId);

    if (!hasAccess) {
      throw new ConvexError("You do not have permission to upload a file to this organization");
    }

    await ctx.db.insert("files", {
      name: args.name,
      orgId: args.orgId,
    });
  },
});

export const getFiles = query({
  args: {
    orgId: v.string(),
  },
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      return [];
    }

    const hasAccess = await hasAccessToOrg(ctx, identity.tokenIdentifier, args.orgId);

    if (!hasAccess) {
      return [];
    }

    return ctx.db.query("files").withIndex("by_orgId", (q) => q.eq("orgId", args.orgId)).collect();
  },
});

// helper function to check if user has access to org
async function hasAccessToOrg(
  ctx: QueryCtx | MutationCtx,
  tokenIdentifier: string,
  orgId: string
) {
  const user = await getUser(ctx, tokenIdentifier);

  const hasAccess =
    user.orgIds.includes(orgId) || user.tokenIdentifier.includes(orgId);

  return hasAccess;
}
import assert from "node:assert/strict";
import { isConfiguredOwner } from "../artifacts/api-server/src/middlewares/requireOwner";

assert.equal(isConfiguredOwner("owner-1", "owner-1"), true);
assert.equal(isConfiguredOwner("user-2", "owner-1"), false);
assert.equal(isConfiguredOwner("owner-1", undefined), false);
assert.equal(isConfiguredOwner("owner-1", "   "), false);
assert.equal(isConfiguredOwner(undefined, "owner-1"), false);

console.log("PASS: owner authorization fails closed when OWNER_USER_ID is absent, blank, or mismatched.");

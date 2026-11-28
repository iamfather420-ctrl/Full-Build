import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifyBookApprovals, canonicalApprovalBytes } from "./verify-book-approvals.mjs";

const NOW = new Date("2026-11-28T18:00:00.000Z");
const TENANT = "iamfather420-ctrl/Full-Build";
const SOURCES = [
  ["24000690","638e9038cd91136d11b2bf7f46a6f8086a751d976f36bf234fd13afef99f3a61"],
  ["10033634","a84800227b7b1db35c17c6ade9fbad35f97fefab4971201578a81850b6eb2104"],
  ["tmp96027691","bb0fd67980beb6c8b7f7f4c91789822f839175ab9ac78298c81232248965bca5"],
  ["11018039","523ed9d3f2b2f0f3333196a56ccede922cccc67991194172f66769768f8f65dc"],
  ["40017591","eff8a209e8539a0c593770be148da1d1160e5192064cee0f161ef0fc4659cc6c"],
  ["31022301","3a466bbe1e6df1c3dbb16ec1c222ffb16e9d799253069702b863b795c15b36d6"],
];
function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "daisy-book-approval-"));
  const trust = path.join(dir, "trust"); mkdirSync(trust);
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  writeFileSync(path.join(trust, "owner-root.spki.pem"), publicKey.export({type:"spki",format:"pem"}));
  const provenancePath = path.join(dir, "provenance.json");
  const approvalsPath = path.join(dir, "approvals.json");
  writeFileSync(provenancePath, JSON.stringify({training_eligible:false,sources:SOURCES.map(([item_id,text_sha256])=>({item_id,text_sha256}))}));
  const make = (id, digest, patch={}) => {
    const row = {schema:"daisy-source-approval/v1",documentId:"loc-book-"+id,sourceId:id,sourceSha256:digest,scope:"source-text-training",approver:"Solvex-Paradox-Box",keyId:"owner-root",tenant:TENANT,issuedAt:"2026-11-28T00:00:00.000Z",expiresAt:"2026-12-28T00:00:00.000Z",...patch};
    row.signature=sign(null,canonicalApprovalBytes(row),privateKey).toString("base64"); return row;
  };
  const approvals=SOURCES.map(([id,digest])=>make(id,digest));
  const packet={schema:"daisy-source-approval-packet/v1",collectionId:"loc-english-grammar-six-books",tenant:TENANT,approvals,revocations:[]};
  const write=()=>writeFileSync(approvalsPath,JSON.stringify(packet));
  write();
  const check=()=>verifyBookApprovals({provenancePath,approvalsPath,trustDir:trust,now:NOW});
  return {dir,trust,packet,approvals,make,write,check};
}
test("six separately signed source-bound approvals are required",()=>{
 const f=fixture(); try { assert.equal(f.check().ok,true); f.packet.approvals.pop(); f.write(); assert.match(f.check().reason,/exactly one approval/); } finally {rmSync(f.dir,{recursive:true,force:true});}
});
test("missing, duplicate, wrong document, and wrong digest approvals block",()=>{
 const f=fixture(); try {
  f.packet.approvals=[]; f.write(); assert.match(f.check().reason,/exactly one approval/);
  f.packet.approvals=f.approvals.concat(f.approvals[0]); f.write(); assert.match(f.check().reason,/exactly one approval/);
  f.packet.approvals=f.approvals.map((a,i)=>i===0?f.make(a.sourceId,a.sourceSha256,{documentId:"wrong-document"}):a); f.write(); assert.match(f.check().reason,/document identity/);
  f.packet.approvals=f.approvals.map((a,i)=>i===0?f.make(a.sourceId,"f".repeat(64)):a); f.write(); assert.match(f.check().reason,/digest does not match/);
 } finally {rmSync(f.dir,{recursive:true,force:true});}
});
test("wrong scope, tenant, approver, expiry, and untrusted signatures block",()=>{
 const f=fixture(); try {
  for (const patch of [{scope:"optimizer-update"},{tenant:"other"},{approver:"someone-else"},{expiresAt:"2020-01-01T00:00:00.000Z"}]) {
   f.packet.approvals=f.approvals.map((a,i)=>i===0?f.make(a.sourceId,a.sourceSha256,patch):a); f.write(); assert.equal(f.check().ok,false);
  }
  f.packet.approvals=f.approvals.map((a,i)=>i===0?{...a,signature:"not-a-signature"}:a); f.write(); assert.match(f.check().reason,/signature/);
 } finally {rmSync(f.dir,{recursive:true,force:true});}
});
test("signed revocation blocks and malformed revocation records fail closed",()=>{
 const f=fixture(); try {
  const revoked={schema:"daisy-source-revocation/v1",documentId:"loc-book-24000690",sourceSha256:SOURCES[0][1],tenant:TENANT,keyId:"owner-root",revokedAt:"2026-11-28T12:00:00.000Z"};
  const {privateKey}=generateKeyPairSync("ed25519");
  // An untrusted revocation cannot be ignored or used to bypass validation.
  revoked.signature=sign(null,canonicalApprovalBytes(revoked),privateKey).toString("base64");
  f.packet.revocations=[revoked]; f.write(); assert.match(f.check().reason,/untrusted source revocation/);
  f.packet.revocations=[{schema:"daisy-source-revocation/v1"}]; f.write(); assert.match(f.check().reason,/Malformed/);
 } finally {rmSync(f.dir,{recursive:true,force:true});}
});
test("aggregate group approval and record booleans are not used by this verifier",()=>{
 const f=fixture(); try {
  f.packet.approvals=[]; f.packet.groupStatus="approved"; f.packet.trainingEligible=true; f.write();
  assert.match(f.check().reason,/exactly one approval/);
 } finally {rmSync(f.dir,{recursive:true,force:true});}
});

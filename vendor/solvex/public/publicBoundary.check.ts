import { REAL_88_PARADOX_REGISTRY } from '../data/paradoxData';
import { DurableStore } from '../database/DurableStore';
import { proposeProblem, publicOperatingPicture } from './publicBoundary';

const picture = publicOperatingPicture();
const serialized = JSON.stringify(picture);
const leaked = REAL_88_PARADOX_REGISTRY.some((item) => serialized.includes(item.name) || serialized.includes(item.z3_smt_assertion));
if (picture.corpus_public_raw !== false) throw new Error('corpus marked public');
if (picture.publish_authorized !== false) throw new Error('publish authorized');
if (picture.payments !== 'disabled') throw new Error('payments enabled');
if (leaked) throw new Error('public picture leaked corpus text');

const beforeOffers = Object.keys(DurableStore.getInstance().getState().offers).length;
const empty = proposeProblem('short');
if (empty.ok) throw new Error('short problem accepted');
const filed = proposeProblem('Need a bounded intake that cannot publish itself.');
if (!filed.ok || filed.state !== 'PROPOSED' || filed.publishable || filed.verified) {
  throw new Error('proposal was not held at PROPOSED');
}
const stored = DurableStore.getInstance().getState().problems[filed.id];
if (!stored || stored.status !== 'PROPOSED') throw new Error('problem was not stored as PROPOSED');
if (Object.keys(DurableStore.getInstance().getState().offers).length !== beforeOffers) {
  throw new Error('proposal created a marketplace offer');
}
const again = JSON.stringify(publicOperatingPicture());
if (REAL_88_PARADOX_REGISTRY.some((item) => again.includes(item.z3_smt_assertion))) {
  throw new Error('picture leaked an assertion after intake');
}

console.log('public-boundary-ok', filed.id);

import type {
  DaisyBuildRequest,
  DaisyBuildResult,
  DaisyWeightEnginePort,
  FullBuildCapabilityPort,
  TrainingCorpusRef,
} from './contracts';

function validateRequest(request: DaisyBuildRequest): string[] {
  const blockers: string[] = [];
  const a = request.architecture;
  if (!a.version.trim()) blockers.push('Daisy architecture version is required.');
  if (!a.architectureFamily.trim()) blockers.push('Architecture family is required.');
  if (!a.tokenizerId.trim()) blockers.push('Tokenizer identity is required.');
  if (!Number.isInteger(a.contextLength) || a.contextLength < 1) blockers.push('Context length must be a positive integer.');
  if (!a.trainingObjectives.length) blockers.push('At least one training objective is required.');
  if (!a.requiredCapabilities.length) blockers.push('At least one target capability is required.');
  for (const [name, value] of Object.entries(a.dimensions)) {
    if (!Number.isInteger(value) || value <= 0) blockers.push(`Architecture dimension "${name}" must be a positive integer.`);
  }
  if (!Object.keys(a.dimensions).length) blockers.push('Explicit architecture dimensions are required before tensor allocation.');
  if (!Number.isInteger(request.maxSteps) || request.maxSteps < 1) blockers.push('maxSteps must be a positive integer.');
  if (!Number.isInteger(request.checkpointEvery) || request.checkpointEvery < 1) blockers.push('checkpointEvery must be a positive integer.');
  if (!request.approval.planApproved) blockers.push('Human approval of the build plan is required.');
  if (!request.approval.resourceApproved) blockers.push('Human approval of compute/resource allocation is required.');
  for (const corpus of request.corpora) {
    if (!corpus.approved) blockers.push(`Training corpus "${corpus.id}" is not approved.`);
    if (!/^[a-f0-9]{64}$/i.test(corpus.sha256)) blockers.push(`Training corpus "${corpus.id}" has no valid SHA-256 checksum.`);
  }
  if (!request.corpora.length) blockers.push('At least one approved, checksummed training corpus is required.');
  return blockers;
}

export class DaisyBuildCoordinator {
  constructor(
    private readonly engine: DaisyWeightEnginePort,
    private readonly fullBuild: FullBuildCapabilityPort,
  ) {}

  async build(request: DaisyBuildRequest): Promise<DaisyBuildResult> {
    const blockers = validateRequest(request);
    if (blockers.length) return { status: 'blocked', completedStages: [], blockers };

    const engineInfo = await this.engine.inspect();
    if (!engineInfo.ready) {
      return {
        status: 'blocked',
        completedStages: ['inventory'],
        blockers: [
          'Weight Engine adapter is not ready.',
          ...engineInfo.missing,
        ],
      };
    }

    const capabilities = await this.fullBuild.inventory();
    const missingCapabilities = request.architecture.requiredCapabilities.filter(
      (id) => !capabilities.some((capability) => capability.id === id),
    );
    if (missingCapabilities.length) {
      return {
        status: 'blocked',
        completedStages: ['inventory'],
        blockers: missingCapabilities.map((id) => `Required Full Build capability is not inventoried: ${id}`),
      };
    }

    const generatedCorpora: TrainingCorpusRef[] = await this.fullBuild.prepareTrainingCorpus(capabilities);
    const corpora = [...request.corpora, ...generatedCorpora];
    if (corpora.some((corpus) => !corpus.approved || !/^[a-f0-9]{64}$/i.test(corpus.sha256))) {
      return {
        status: 'blocked',
        completedStages: ['inventory'],
        blockers: ['Full Build supplied an unapproved or unchecksummed training corpus.'],
      };
    }

    const plan = await this.engine.plan(request.architecture);
    if (plan.tensorCount <= 0 || plan.parameterCount <= 0 || plan.estimatedMemoryBytes <= 0) {
      return {
        status: 'blocked',
        completedStages: ['inventory', 'plan'],
        plan,
        blockers: ['Weight Engine returned an invalid tensor, parameter, or memory estimate.'],
      };
    }

    const initial = await this.engine.initialize(plan, request.architecture);
    if (initial.architectureHash !== plan.architectureHash || initial.parameterCount !== plan.parameterCount) {
      return {
        status: 'blocked',
        completedStages: ['inventory', 'plan', 'initialize'],
        plan,
        artifact: initial,
        blockers: ['Initialized weights do not match the approved architecture plan.'],
      };
    }

    const trained = await this.engine.train({
      initial,
      corpora,
      maxSteps: request.maxSteps,
      checkpointEvery: request.checkpointEvery,
    });

    if (trained.architectureHash !== plan.architectureHash) {
      return {
        status: 'blocked',
        completedStages: ['inventory', 'plan', 'initialize', 'train'],
        plan,
        artifact: trained,
        blockers: ['Training changed the architecture identity; refusing validation/export.'],
      };
    }

    const validation = await this.engine.validate(trained, request.architecture);
    if (!validation.passed || validation.checks.some((check) => !check.passed)) {
      return {
        status: 'blocked',
        completedStages: ['inventory', 'plan', 'initialize', 'train', 'validate'],
        plan,
        artifact: trained,
        validation,
        blockers: ['Daisy weight validation did not pass every required check.'],
      };
    }

    const result: DaisyBuildResult = {
      status: 'validated',
      completedStages: ['inventory', 'plan', 'initialize', 'train', 'validate'],
      plan,
      artifact: trained,
      validation,
      blockers: [],
    };

    if (!request.approval.releaseApproved) {
      result.blockers.push('Validated model is not exported: human release approval is required.');
      return result;
    }

    const exported = await this.engine.export(trained, request.architecture.targetFormat);
    if (exported.checksum !== trained.checksum && exported.format === trained.format) {
      return {
        ...result,
        status: 'blocked',
        blockers: ['Export checksum does not match the validated source artifact.'],
      };
    }

    return {
      ...result,
      status: 'exported',
      completedStages: [...result.completedStages, 'export'],
      exported,
    };
  }
}

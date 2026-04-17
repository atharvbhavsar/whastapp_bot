// =================================================================================
// CIVIC COMPLAINT SYSTEM - STEP 2: STATUS MACHINE & TRANSITION RULES
// =================================================================================

/**
 * Valid complaint statuses mapped exactly to the database ENUM.
 */
export enum ComplaintStatus {
  FILED = 'filed',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  CLOSED = 'closed',
}

/**
 * Roles allowed to perform transitions.
 */
export enum ActorRole {
  CITIZEN = 'citizen',
  OFFICER = 'officer',
  SUPERVISOR = 'supervisor',
  SYSTEM = 'system', // AI or chron jobs
}

/**
 * A definition of what is allowed to happen after the current state.
 */
interface StateTransition {
  allowedNextStates: ComplaintStatus[];
  requiredEvidence: string[];
  allowedActors: ActorRole[];
}

/**
 * Core Status Machine Rules.
 * Prevents illegal hops (e.g. Filed -> Resolved directly without being In Progress).
 */
export const COMPLAINT_STATE_MACHINE: Record<ComplaintStatus, StateTransition> = {
  [ComplaintStatus.FILED]: {
    allowedNextStates: [ComplaintStatus.ASSIGNED, ComplaintStatus.ESCALATED],
    requiredEvidence: [],
    allowedActors: [ActorRole.SYSTEM, ActorRole.SUPERVISOR],
  },
  [ComplaintStatus.ASSIGNED]: {
    allowedNextStates: [ComplaintStatus.IN_PROGRESS, ComplaintStatus.ESCALATED],
    requiredEvidence: [],
    allowedActors: [ActorRole.OFFICER, ActorRole.SYSTEM],
  },
  [ComplaintStatus.IN_PROGRESS]: {
    allowedNextStates: [ComplaintStatus.RESOLVED, ComplaintStatus.ESCALATED],
    // STRICT RULE: Cannot transition to RESOLVED without before/after media and geo validation.
    requiredEvidence: ['after_media_url', 'geofence_validated'],
    allowedActors: [ActorRole.OFFICER],
  },
  [ComplaintStatus.RESOLVED]: {
    // If citizen disputes, it goes back to IN_PROGRESS or ESCALATED. If they accept, CLOSED.
    allowedNextStates: [ComplaintStatus.CLOSED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.ESCALATED],
    requiredEvidence: [],
    allowedActors: [ActorRole.CITIZEN, ActorRole.SUPERVISOR, ActorRole.SYSTEM], // System auto-closes after SLA
  },
  [ComplaintStatus.ESCALATED]: {
    allowedNextStates: [ComplaintStatus.ASSIGNED, ComplaintStatus.CLOSED],
    requiredEvidence: ['resolution_notes'],
    allowedActors: [ActorRole.SUPERVISOR],
  },
  [ComplaintStatus.CLOSED]: {
    allowedNextStates: [], // Terminal state
    requiredEvidence: [],
    allowedActors: [],
  },
};

/**
 * Transition validation engine.
 */
export class StatusEngine {
  /**
   * Validate if a transition is legal for the given user, state, and evidence payload.
   * Throws an error if invalid, returns true if valid.
   */
  static validateTransition(
    currentState: ComplaintStatus,
    targetState: ComplaintStatus,
    actor: ActorRole,
    providedEvidenceKeys: string[] = []
  ): boolean {
    const rules = COMPLAINT_STATE_MACHINE[currentState];

    if (!rules) {
      throw new Error(`State machine error: Unknown current state ${currentState}`);
    }

    // 1. Check if the hop is allowed
    if (!rules.allowedNextStates.includes(targetState)) {
      throw new Error(
        `Illegal transition: Cannot move from ${currentState} to ${targetState}. Allowed next states: ${rules.allowedNextStates.join(', ')}`
      );
    }

    // 2. Check if the actor is authorized to make this hop
    if (!rules.allowedActors.includes(actor)) {
      throw new Error(
        `Unauthorized: Role ${actor} cannot transition complaint from ${currentState} to ${targetState}.`
      );
    }

    // 3. Evaluate conditional evidence requirements based on specific hops.
    // e.g. IN_PROGRESS -> RESOLVED requires evidence.
    if (currentState === ComplaintStatus.IN_PROGRESS && targetState === ComplaintStatus.RESOLVED) {
      for (const required of COMPLAINT_STATE_MACHINE[ComplaintStatus.IN_PROGRESS].requiredEvidence) {
        if (!providedEvidenceKeys.includes(required)) {
          throw new Error(`Missing required evidence for resolution: ${required}`);
        }
      }
    }

    if (currentState === ComplaintStatus.ESCALATED && targetState === ComplaintStatus.CLOSED) {
      if (!providedEvidenceKeys.includes('resolution_notes')) {
          throw new Error(`Missing required evidence for escalation closure: resolution_notes`);
      }
    }

    return true;
  }
}

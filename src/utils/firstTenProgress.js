const FIRST_TEN_MILESTONE = 10;

export function createFirstTenProgress() {
  const confirmedActionIds = new Set();
  let milestoneArmed = true;
  let milestoneSealed = false;

  return {
    confirm(actionId) {
      if (
        milestoneSealed ||
        typeof actionId !== "string" ||
        confirmedActionIds.has(actionId)
      ) {
        return {
          count: milestoneSealed
            ? FIRST_TEN_MILESTONE + 1
            : confirmedActionIds.size,
          didAdvance: false,
          reachedMilestone: false,
        };
      }

      const previousCount = confirmedActionIds.size;
      if (previousCount === FIRST_TEN_MILESTONE) {
        // Undo can only target the latest server-confirmed choice. Once a
        // distinct eleventh action confirms, progress can never return 10→9,
        // so release every retained ID and permanently retire the milestone.
        confirmedActionIds.clear();
        milestoneSealed = true;
        return {
          count: FIRST_TEN_MILESTONE + 1,
          didAdvance: true,
          reachedMilestone: false,
        };
      }

      confirmedActionIds.add(actionId);
      const reachedMilestone =
        milestoneArmed &&
        previousCount === FIRST_TEN_MILESTONE - 1 &&
        confirmedActionIds.size === FIRST_TEN_MILESTONE;
      if (reachedMilestone) milestoneArmed = false;

      return {
        count: confirmedActionIds.size,
        didAdvance: true,
        reachedMilestone,
      };
    },

    undo(actionId) {
      if (milestoneSealed) {
        return {
          count: FIRST_TEN_MILESTONE + 1,
          didDecrement: false,
          rearmedMilestone: false,
        };
      }

      const previousCount = confirmedActionIds.size;
      const didDecrement = confirmedActionIds.delete(actionId);
      const rearmedMilestone =
        didDecrement &&
        previousCount === FIRST_TEN_MILESTONE &&
        confirmedActionIds.size === FIRST_TEN_MILESTONE - 1;
      if (rearmedMilestone) milestoneArmed = true;

      return {
        count: confirmedActionIds.size,
        didDecrement,
        rearmedMilestone,
      };
    },

    getCount() {
      return milestoneSealed
        ? FIRST_TEN_MILESTONE + 1
        : confirmedActionIds.size;
    },

    getTrackedActionCount() {
      return confirmedActionIds.size;
    },
  };
}

import { createFirstTenProgress } from "./firstTenProgress";

describe("first-ten confirmed action progress", () => {
  it("counts each confirmed action ID once and ignores failed or retired attempts", () => {
    const progress = createFirstTenProgress();

    for (let index = 1; index <= 9; index += 1) {
      expect(progress.confirm(`action-${index}`)).toMatchObject({
        count: index,
        reachedMilestone: false,
      });
    }

    // Failed and retired requests never call confirm, so visual feed positions
    // can advance without changing confirmed progress.
    expect(progress.getCount()).toBe(9);
    expect(progress.confirm("action-9")).toEqual({
      count: 9,
      didAdvance: false,
      reachedMilestone: false,
    });
    expect(progress.confirm("action-10")).toEqual({
      count: 10,
      didAdvance: true,
      reachedMilestone: true,
    });
    expect(progress.confirm("action-10")).toEqual({
      count: 10,
      didAdvance: false,
      reachedMilestone: false,
    });
  });

  it("re-arms only when a confirmed undo moves progress from ten to nine", () => {
    const progress = createFirstTenProgress();
    for (let index = 1; index <= 10; index += 1) {
      progress.confirm(`action-${index}`);
    }

    expect(progress.undo("missing-action")).toEqual({
      count: 10,
      didDecrement: false,
      rearmedMilestone: false,
    });
    expect(progress.undo("action-10")).toEqual({
      count: 9,
      didDecrement: true,
      rearmedMilestone: true,
    });
    expect(progress.confirm("replacement-10")).toEqual({
      count: 10,
      didAdvance: true,
      reachedMilestone: true,
    });
  });

  it("seals after a distinct eleventh confirmation and releases tracked IDs", () => {
    const progress = createFirstTenProgress();
    for (let index = 1; index <= 10; index += 1) {
      progress.confirm(`action-${index}`);
    }
    expect(progress.getTrackedActionCount()).toBe(10);

    expect(progress.confirm("action-11")).toEqual({
      count: 11,
      didAdvance: true,
      reachedMilestone: false,
    });
    expect(progress.getTrackedActionCount()).toBe(0);
    expect(progress.undo("action-11")).toEqual({
      count: 11,
      didDecrement: false,
      rearmedMilestone: false,
    });

    for (let index = 12; index <= 10_000; index += 1) {
      progress.confirm(`action-${index}`);
    }
    expect(progress.getCount()).toBe(11);
    expect(progress.getTrackedActionCount()).toBe(0);
  });

  it("keeps progress when feed configuration changes do not replace the tracker", () => {
    const progress = createFirstTenProgress();
    for (let index = 1; index <= 9; index += 1) {
      progress.confirm(`before-reset-${index}`);
    }

    // Feed, filter, and personalization resets reuse this mounted experience.
    expect(progress.confirm("after-reset-1")).toMatchObject({
      count: 10,
      reachedMilestone: true,
    });
  });
});

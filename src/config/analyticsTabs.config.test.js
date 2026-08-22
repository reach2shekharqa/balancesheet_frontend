import test from "node:test";
import assert from "node:assert/strict";

import { analyticsTabs, defaultAnalyticsTab, isAnalyticsTabActive, visibleAnalyticsTabs } from "./analyticsTabs.config.js";

test("analytics tab config controls order, visibility, and default focus", () => {
    assert.deepEqual(visibleAnalyticsTabs.map(tab => tab.id), analyticsTabs.filter(tab => tab.visible).map(tab => tab.id));
    assert.equal(defaultAnalyticsTab, "keyMetrics1A");
    assert.equal(isAnalyticsTabActive(analyticsTabs.find(tab => tab.id === "balanceSheet"), "breakdown"), true);
});

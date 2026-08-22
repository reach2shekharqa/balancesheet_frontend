import test from "node:test";
import assert from "node:assert/strict";
import { extractIdentityFromPdfText } from "./identityTextParser.js";

test("extracts and normalizes CIN, PAN, and company name", () => {
    assert.deepEqual(extractIdentityFromPdfText(`
        Legal Name:   Example   Holdings   Limited
        Corporate Identity Number: u12345hr2010ptc123456
        Permanent Account Number: abcde1234f
    `), {
        companyName: "EXAMPLE HOLDINGS LIMITED",
        cin: "U12345HR2010PTC123456",
        pan: "ABCDE1234F",
    });
});

test("supports company name label variants", () => {
    assert.equal(
        extractIdentityFromPdfText("Name of the Company - Example Private Limited").companyName,
        "EXAMPLE PRIVATE LIMITED"
    );
    assert.equal(
        extractIdentityFromPdfText("CIN: U12345HR2010PTC123456\nPAN: ABCDE1234F").cin,
        "U12345HR2010PTC123456"
    );
});

test("extracts a CIN split into PDF text segments", () => {
    assert.equal(
        extractIdentityFromPdfText("CIN: U12345 HR 2010 PTC 123456").cin,
        "U12345HR2010PTC123456"
    );
});

test("leaves missing identity fields incomplete rather than guessing", () => {
    const identity = extractIdentityFromPdfText("Legal Name: Example Private Limited");
    assert.equal(identity.cin, null);
    assert.equal(identity.pan, null);
    assert.equal(identity.companyName, "EXAMPLE PRIVATE LIMITED");
});

test("extracts CIN when the label contains repeated separators", () => {
    for (const label of ["CIN-:", "CIN:", "CIN-"]) {
        assert.equal(
            extractIdentityFromPdfText(`${label} U12345HR2010PTC123456`).cin,
            "U12345HR2010PTC123456"
        );
    }
});
# Workflow Index

## Purpose

This directory is the source of truth for requirements, plans, implementation records, capability specs, and Agent pre-coding context.

## Active Work

REQ-0001 setup files have been created and verified. Future work should start from `.workflow/current.md` and follow the linked context.

| ID | Title | Status | Plan | Implementation | Capabilities |
| --- | --- | --- | --- | --- | --- |
| REQ-0001 | Establish project-local workflow protocol | verified | [plan](plans/REQ-0001-plan.md) | [implementation](implementations/REQ-0001-implementation.md) | [CAP-0001](capabilities/CAP-0001.md) |

## Requirement Status Flow

draft -> accepted -> planned -> implemented -> verified -> archived

## Planning Rule

A requirement needs a plan when `complexity` is `medium` or `complex`, or when `risk_tags` includes `data`, `security`, `migration`, `external-api`, `architecture`, or `cross-module`.

## Capability Specs

| ID | Title | Status | Introduced By |
| --- | --- | --- | --- |
| CAP-0001 | Agent pre-coding context entry point | active | REQ-0001 |

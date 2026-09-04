# Status Page System - Possible Scenarios

## Overview
The status page system now works with admins directly choosing component status, and overall status is derived from the worst component status.

---

## Impact Scope Options
Admins can choose from these impact scopes when creating an incident:

1. **Site Wide** - Affects the entire platform
2. **Scaled Down** - Reduced functionality across the platform
3. **Limited Users** - Only affects a subset of users
4. **Specific Feature** - Only affects one specific feature/component
5. **No Effect** - No actual impact (informational only)

---

## Component Status Options
Admins **must** choose one of these when creating an incident (no Auto option):

1. **Degraded Performance** - Service is slow or partially functional
2. **Partial Outage** - Some functionality is unavailable
3. **Major Outage** - Service is completely unavailable
4. **Investigating** - Issue is being investigated
5. **Maintenance** - Scheduled maintenance in progress

---

## Overall Status Calculation
The overall system status is determined by the **worst component status** across all public components:

| Worst Component Status | Overall Status Display |
|------------------------|------------------------|
| `major_outage` | Major Outage |
| `partial_outage` | Major Outage (partial_outage shows as major_outage overall) |
| `degraded_performance` | Degraded Performance |
| `investigating` | Degraded Performance |
| `maintenance` | Maintenance |
| `operational` (all components) | All Systems Operational |

**Priority Order:** `major_outage` > `partial_outage` > `degraded_performance` > `investigating` > `maintenance` > `operational`

---

## Example Scenarios

### Scenario 1: Minor Incident with Degraded Performance
- **Severity:** Minor
- **Impact Scope:** Scaled Down
- **Component Status:** Degraded Performance
- **Result:**
  - Affected components show: "Degraded Performance"
  - Overall status: "Degraded Performance"
  - Users see: Service is slower than usual

### Scenario 2: Major Incident with Partial Outage
- **Severity:** Major
- **Impact Scope:** Site Wide
- **Component Status:** Partial Outage
- **Result:**
  - Affected components show: "Partial Outage"
  - Overall status: "Major Outage" (partial_outage elevates to major_outage overall)
  - Users see: Some features unavailable

### Scenario 3: Critical Incident with Major Outage
- **Severity:** Critical
- **Impact Scope:** Site Wide
- **Component Status:** Major Outage
- **Result:**
  - Affected components show: "Major Outage"
  - Overall status: "Major Outage"
  - Users see: Service completely unavailable

### Scenario 4: Limited Users Affected
- **Severity:** Minor
- **Impact Scope:** Limited Users
- **Component Status:** Degraded Performance
- **Result:**
  - Only specific components show: "Degraded Performance"
  - Overall status: "Degraded Performance" (if this is the worst)
  - Users see: Some users experiencing issues

### Scenario 5: Specific Feature Issue
- **Severity:** Major
- **Impact Scope:** Specific Feature
- **Component Status:** Partial Outage
- **Result:**
  - Only the affected component shows: "Partial Outage"
  - Overall status: "Major Outage" (if this is the worst component)
  - Users see: One feature unavailable

### Scenario 6: Multiple Incidents Affecting Different Components
- **Incident 1:** Component A - Degraded Performance
- **Incident 2:** Component B - Partial Outage
- **Result:**
  - Component A shows: "Degraded Performance"
  - Component B shows: "Partial Outage"
  - Overall status: "Major Outage" (worst is partial_outage, which shows as major_outage)

### Scenario 7: Scheduled Maintenance
- **Severity:** Minor
- **Impact Scope:** Site Wide
- **Component Status:** Maintenance
- **Result:**
  - Affected components show: "Maintenance"
  - Overall status: "Maintenance" (if this is the worst)
  - Users see: Scheduled maintenance in progress

### Scenario 8: Investigation Phase
- **Severity:** Major
- **Impact Scope:** Scaled Down
- **Component Status:** Investigating
- **Result:**
  - Affected components show: "Investigating"
  - Overall status: "Degraded Performance" (investigating shows as degraded_performance overall)
  - Users see: Issue being investigated

### Scenario 9: No Effect (Informational)
- **Severity:** Minor
- **Impact Scope:** No Effect
- **Component Status:** Degraded Performance
- **Result:**
  - Affected components show: "Degraded Performance"
  - Overall status: Based on worst component (could be this or another)
  - Users see: Informational notice, minimal impact

### Scenario 10: All Components Operational
- **No Active Incidents**
- **Result:**
  - All components show: "Operational"
  - Overall status: "All Systems Operational"
  - Users see: Everything working normally

---

## Key Rules

1. **Component Status is Required:** Admins must choose a component status - there's no auto-calculation
2. **Overall Status = Worst Component:** The overall status is always the worst status among all public components
3. **Partial Outage = Major Outage Overall:** If any component has `partial_outage`, the overall status shows as `major_outage`
4. **Severity is Informational:** Incident severity (Minor/Major/Critical) doesn't affect component status - it's just for categorization
5. **Impact Scope is Informational:** Impact scope describes the reach but doesn't determine component status
6. **Component Status Drives Everything:** The component status chosen by the admin directly determines what users see

---

## Status Hierarchy (Worst to Best)

1. **Major Outage** - Complete service unavailability
2. **Partial Outage** - Some features unavailable (shows as Major Outage overall)
3. **Degraded Performance** - Service is slow or partially functional
4. **Investigating** - Issue being investigated (shows as Degraded Performance overall)
5. **Maintenance** - Scheduled maintenance
6. **Operational** - Everything working normally

---

## Admin Workflow

1. **Create Incident:**
   - Enter title, description
   - Choose severity (Minor/Major/Critical) - informational only
   - Choose impact scope (Site Wide/Scaled Down/etc.) - informational only
   - **Choose component status** (required) - this determines what users see
   - Select affected components
   - Set incident status (investigating/identified/etc.)

2. **Component Status Updates:**
   - When incident is created, affected components automatically get the chosen component status
   - When incident is resolved, components restore to their original status
   - Multiple incidents affecting the same component use the worst status

3. **Overall Status:**
   - Automatically calculated from worst component status
   - Updates in real-time as incidents are created/resolved
   - Displayed in footer and status page header


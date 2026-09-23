# RTI Black Hole — Backend Architecture

This directory houses the shared Firebase backend configuration, security rules, indexes, and Cloud Functions for the RTI Black Hole platform (supporting both the Citizen App `RTI Sathi` and the Clerk Dashboard `RTI Clerk`).

## Project Configuration
- **Firebase Project ID**: `rti-black-hole`
- **Firestore Collections**:
  - `users/{uid}`: Citizen and Clerk user records
  - `clerks/{uid}`: Clerk profiles and status
  - `departments/{departmentId}`: Public authorities catalog
  - `applications/{applicationId}`: Core RTI applications
    - `events/{eventId}`: Immutable audit logs
    - `clarifications/{clarificationId}`: Officer clarification questions & citizen replies
    - `reviews/{reviewId}`: Protected internal officer notes
    - `routing/{routingId}`: Official dispatch slips
  - `notifications/{notificationId}`: Real-time notifications for citizens and clerks

## Deployment Commands
To deploy backend rules, indexes, and Cloud Functions to the live Firebase project:

```bash
# From e:\Project\RTI-Clerk\backend
cmd /c npm --prefix functions install
cmd /c npm --prefix functions run build
firebase deploy --only firestore:rules,firestore:indexes,storage:rules,functions
```

Below is an end-to-end, no-code checklist for turning your existing React + FastAPI assistant into a Brightspace plug-in. Follow the steps in sequence; each one maps to the way D2L expects external tools to behave.

1. Pre-requisites
   • LTI 1.3 readiness – your backend must expose an /lti/launch endpoint that can sign and verify JWTs (public-private keys).
   • OAuth 2 scopes – for optional REST calls (pulling PDFs, pushing analytics) you will register a Brightspace API client. ￼
   • Admin access in a test Brightspace tenant – only admins can create External Learning Tools and custom widgets. ￼

⸻

2. Register the tool (one-time)
   1. **Admin Tools → External Learning Tools → LTI Advantage tab → Register Tool **. ￼
   2. Copy the generated Client ID and Brightspace Keyset URL; paste your public key URL so Brightspace can validate your JWT.
   3. Choose Scopes: at minimum LtiDeepLinking and AssignmentGradeService; add more only if you need roster or grade return. ￼

⸻

3. Create a deployment
   1. Still in External Learning Tools, click New Deployment and select the tool you just registered. ￼
   2. Link settings:
      • Visibility = “Allow links to show” so instructors can add it.
      • Role access – enable Learner & Instructor.
   3. Brightspace generates a Deployment ID; store it in your backend so you can validate launch claims.

⸻

4. Add launch links for instructors

A. Deep-link quicklink
• In any course, instructor goes Content → Existing Activities → External Learning Tools and picks your tool. ￼
• Brightspace passes the course and user context in the LTI launch payload.

B. Persistent chat widget (optional)
• Admin creates Course Admin → Widgets → New Custom Widget; paste a small <iframe src="https://your-frontend/chat?lti=true"> snippet. ￼
• Place the widget on the course homepage layout so the assistant is always visible.

⸻

5. Secure the launch handshake
   1. On launch, Brightspace sends an id_token (JWT).
   2. Your FastAPI endpoint verifies signature via Brightspace’s key-set URL and checks aud, iss, deployment_id.
   3. Issue your own session token, then redirect the iframe to your React chat UI.

(All JWT fields and key URLs come from the registration screen earlier.)

⸻

6. Pull course PDFs programmatically (optional)

If you want the assistant to auto-ingest new files:
• Register an OAuth2 client in Brightspace Developer Platform; note client_id and secret. ￼
• Use the Content Service API to list and download files (/d2l/api/le/1.54/{orgUnitId}/content), then feed them into your existing embedding pipeline. ￼

⸻

7. Return analytics (optional)
   • Push high-level usage stats back to instructors via Grades API or display them inside your own iframe page for the Instructor role.

⸻

8. Enhance engagement
   • Configure Intelligent Agents to email a deep-link to your assistant when a student misses a quiz; this keeps help contextual. ￼
   • Add your company to the D2L Partner / Channel Exchange once stable—helps procurement discover and trust the tool. ￼

⸻

9. Testing checklist

Test Expected result
LTI launch (Learner) Chat UI opens in iframe, shows course-name badge.
LTI launch (Instructor) Extra “Analytics” tab visible.
PDF sync Newly uploaded lecture slides are embedded within minutes.
Permission toggle Removing a role’s tool access blocks launch with an error page.

⸻

10. Go-live
    1.  Move registration & deployment steps to the production Brightspace org.
    2.  Enable sandboxing on the custom widget for extra XSS safety. ￼
    3.  Issue admin-facing documentation that maps your tool’s roles to Brightspace roles and details data flows for the privacy office.

⸻

Key take-away

By registering as an LTI 1.3 tool provider, adding a deployment, and optionally embedding a custom widget, you can surface your already-working React + FastAPI assistant inside Brightspace with no code changes to core logic—only the JWT launch handshake and, if desired, REST calls for deeper content sync and analytics.

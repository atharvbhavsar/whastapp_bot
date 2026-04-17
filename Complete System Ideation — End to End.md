# **Complete System Ideation — End to End**

---

## **Feature Split by Dashboard**

### **User-Side**

| \# | Feature |
| ----- | ----- |
| 1 | Complaint submission — photo/video/voice/text |
| 2 | Auto GPS location tagging |
| 4 | Unique complaint ID |
| 6 | Real-time status tracking |
| 7 | Notifications at every stage |
| 11 | Citizen dispute — "Not Fixed" button |
| 12 | Locality clustering — see nearby complaints, Me Too |

### **Admin-Side**

| \# | Feature |
| ----- | ----- |
| 3 | AI auto-categorization → department routing |
| 5 | Priority score engine |
| 8 | Authority dashboard — view, filter, assign |
| 9 | Field officer mobile update |
| 10 | Before/After photo proof |
| 13 | Recurring issue flag |

---

## **End-to-End System Flow**

---

### **STAGE 1 — Citizen Submits a Complaint**

Citizen opens the app. No long forms. No department selection. No bureaucratic language.

They do one of four things:

* Take a **photo** of the issue  
* Record a **short video**  
* Send a **voice note** describing it  
* Type a **text description**

The moment they submit:

* GPS **automatically tags** the exact location — street, ward, zone — no manual input  
* System generates a **unique complaint ID** instantly — example `CIV-2024-08471`  
* Citizen sees confirmation screen with their ID and a status bar starting at **"Filed"**

**What the citizen experiences:** Open app → point camera → submit → done in under 30 seconds.

---

### **STAGE 2 — AI Processes the Submission**

The moment the complaint lands in the system, AI reads it before any human does.

**From a photo or video:**

* Identifies what the problem is — pothole, garbage overflow, broken streetlight, sewage leak, fallen tree, encroachment, stray animal, waterlogging, damaged road, broken bench, exposed wire  
* Estimates severity — minor, moderate, severe, critical — based on visual cues like size, spread, visible damage, safety risk  
* Reads the location metadata and cross-references with the department zone map

**From a voice note:**

* Transcribes speech to text  
* NLP reads the transcription and extracts issue type, location context, urgency language

**From text:**

* NLP categorizes directly

**Output of AI stage:**

Complaint CIV-2024-08471  
Issue Type:     Pothole  
Department:     Roads & Infrastructure  
Zone:           Zone B, Ward 14  
Severity:       7/10 — Large, water pooling visible  
Urgency Tag:    High

This happens in seconds. Zero human involvement at this stage.

---

### **STAGE 3 — Locality Clustering Check**

Before creating a new complaint, system checks:

Is there an existing OPEN complaint of the same category  
within \[radius\] of this GPS location?

Pothole        → 50m radius  
Garbage        → 30m radius  
Water leakage  → 100m radius  
Flooding       → 500m radius  
Streetlight    → 40m radius

**Two outcomes:**

**A — No existing complaint nearby:**

New master complaint created. Complaint ID assigned. Enters the priority queue.

**B — Existing complaint found nearby:**  
New report is attached as a supporting report to the master complaint.  
The master complaint's community count goes up by 1\.  
Priority score is recalculated immediately.

The citizen still gets their own complaint ID and receives all future updates on the master complaint.

**What the citizen sees when submitting near an existing issue:**

"12 people have already reported this issue nearby.  
Your report has been added to the group complaint.  
You will be notified when it is resolved."

\[TAP TO SEE NEARBY COMPLAINTS ON MAP\]

Citizen can also browse nearby complaints and tap **"Me Too"** on any — a passive one-tap confirmation that adds their weight to the cluster without filing a full report.

---

### **STAGE 4 — Priority Score Calculation**

Every complaint — new or clustered — gets a live priority score that updates continuously.

PRIORITY SCORE \=   
  Severity Score (AI)          → max 40 points  
\+ Community Count Score        → max 30 points  
\+ Days Pending Score           → max 20 points  
\+ Category Urgency Weight      → max 10 points

─────────────────────────────────────────  
Severity scoring:  
  Minor (1-3):    10 pts  
  Moderate (4-6): 20 pts  
  Severe (7-8):   30 pts  
  Critical (9-10):40 pts

Community count scoring:  
  1-5 reports:    5 pts  
  6-15 reports:   12 pts  
  16-30 reports:  22 pts  
  31+ reports:    30 pts

Days pending scoring:  
  Day 1:          2 pts  
  Day 3:          8 pts  
  Day 5:          15 pts  
  Day 7+:         20 pts (max, triggers escalation)

Category urgency weights:  
  Exposed wire / road collapse: 10 pts  
  Water contamination:          8 pts  
  Flooding / sewage:            7 pts  
  Pothole / garbage:            5 pts  
  Broken bench / painting:      2 pts  
─────────────────────────────────────────  
Score 0-30:   LOW — standard queue  
Score 31-55:  MEDIUM — elevated  
Score 56-75:  HIGH — priority handling  
Score 76-100: CRITICAL — immediate action

This score is the **single source of truth** for what gets fixed first. Not who complained louder. Not which ward the officer lives in. Pure data.

---

### **STAGE 5 — Auto Routing to Department & Officer**

Priority score calculated. Now the complaint gets a home.

Issue: Pothole, Zone B, Ward 14, Priority: 71 (HIGH)  
         ↓  
System maps Ward 14, Zone B → Roads Department, Zone B Team  
         ↓  
Checks: Which officer in Zone B Roads has lowest   
        current active workload?  
         ↓  
Auto-assigns to: Officer Ravi Kumar (3 active complaints)  
vs Officer Suresh M. (8 active complaints)  
         ↓  
Ravi Kumar receives mobile notification:  
"New complaint assigned — Pothole, MG Road near Bus Stop  
 Priority: HIGH | Severity: 7/10 | Reports: 12 citizens  
 SLA: Resolve within 5 working days  
 \[VIEW ON MAP\]"

**SLA is set automatically by category:**

| Category | SLA |
| ----- | ----- |
| Exposed wire / road collapse | 4 hours |
| Water contamination / sewage burst | 12 hours |
| Flooding | 24 hours |
| Pothole / garbage overflow | 5 days |
| Streetlight / drainage | 7 days |
| Park / minor infrastructure | 14 days |

SLA clock starts the moment complaint is assigned.

---

### **STAGE 6 — Citizen Tracking & Notifications**

From the moment of submission, citizen has full visibility.

**Status bar in app:**

✅ Filed          → 10:14 AM, Day 1  
✅ AI Processed   → 10:14 AM, Day 1  
✅ Assigned       → 11:30 AM, Day 1 (Roads Dept, Zone B)  
🔄 In Progress    → 9:00 AM, Day 3 (Officer on site)  
⬜ Resolved  
⬜ Verified

**Notifications pushed at each stage:**

Day 1, 10:14 AM  
"Your complaint CIV-2024-08471 has been filed.  
 Category: Pothole | Location: MG Road, Ward 14  
 Track it anytime with your complaint ID."

Day 1, 11:30 AM  
"Your complaint has been assigned to the   
 Roads Department. Expected resolution: 5 days."

Day 3, 9:00 AM  
"Work has begun on your complaint.  
 Officer is on site."

Day 4, 2:00 PM  
"Your complaint has been marked Resolved.  
 Was it fixed? \[YES ✅\] \[NO ❌\]"

No black hole. Citizen always knows exactly where things stand.

---

### **STAGE 7 — Authority Dashboard (Admin Side)**

Department heads and officers log into a structured dashboard — not an inbox of chaos.

**What they see:**

ROADS DEPARTMENT — ZONE B DASHBOARD  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
Active Complaints: 34  
Critical (76-100): 3  🔴  
High (56-75):      9  🟠  
Medium (31-55):    16 🟡  
Low (0-30):        6  🟢

Overdue SLA:       4  ⚠️  
Avg Resolution:    4.8 days  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Complaint list — sorted by priority score (highest first):**

\#1  Score:94  CRITICAL  Pothole MG Road      47 reports  Day 6  ⚠️ OVERDUE  
\#2  Score:81  CRITICAL  Road cave-in Baner   12 reports  Day 1  
\#3  Score:74  HIGH      Pothole FC Road      23 reports  Day 4  
\#4  Score:68  HIGH      Road damage Kothrud   8 reports  Day 3  
...

**Filters available:**

* By priority level  
* By category  
* By ward/zone  
* By SLA status (on track / at risk / overdue)  
* By officer assigned  
* By days pending

**Actions available:**

* Assign / Reassign to officer  
* Change status  
* Add internal note  
* View all photos submitted by citizens  
* View complaint location on live map

**Live map view:**

* All active complaints plotted as pins  
* Color coded by priority  
* Cluster view for dense areas  
* Click any pin → full complaint detail

---

### **STAGE 8 — Field Officer Mobile Experience**

Officer doesn't need to be at a desk. Everything on their phone.

**Their view:**

MY ASSIGNED COMPLAINTS — TODAY  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
1\. Pothole — MG Road         🔴 HIGH    2.1km away  
2\. Road crack — Baner Rd     🟠 MEDIUM  3.4km away    
3\. Pothole — FC Road         🟠 MEDIUM  1.8km away  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
\[OPTIMIZE MY ROUTE TODAY\]

Route optimization button sequences their complaints by proximity — least travel, most complaints resolved.

**On arriving at complaint site:**

* Officer taps "Mark In Progress"  
* Sees original complaint photos to know exactly what to look for  
* Sees exact GPS pin

**On completing repair:**

* Officer taps "Mark Resolved"  
* System demands: **upload after-photo from current GPS location**  
* Cannot submit resolution without this photo  
* GPS locks the photo — cannot upload an old photo from a different location

---

### **STAGE 9 — Before/After Verification**

This is where fake closures are eliminated.

Officer uploads after-photo  
         ↓  
AI compares:  
  Before photo: Large pothole, water pooling, 60cm diameter  
  After photo:  Same location, road surface smooth, filled  
         ↓  
AI scores match: 87% improvement detected  
         ↓  
Resolution tentatively approved  
         ↓  
Citizen notified: "Your complaint has been resolved.  
                   Please confirm. \[YES ✅\] \[NO ❌\]"  
         ↓  
Citizen has 48 hours to respond

**If citizen confirms YES:**

* Complaint closed  
* Officer and department get positive resolution credit  
* Data feeds into analytics

**If citizen taps NO — Dispute triggered:**

Citizen selects reason:  
\[Issue still exists\] \[Partially fixed\] \[New issue created\]

Complaint auto-reopens  
Status resets to: "Disputed — Under Review"  
Escalated immediately to Department Head  
Officer's resolution record flagged  
Head must personally review within 24 hours

**If citizen doesn't respond in 48 hours:**

* System auto-closes with note "No dispute filed"  
* Complaint marked resolved

---

### **STAGE 10 — Auto Escalation Chain**

Running parallel to everything above — a timer that cannot be paused.

Day 0    Complaint assigned to officer  
         ↓  
Day 3    Automated reminder sent to officer  
         ↓  
Day \[SLA \- 1\]  Yellow alert to Department Head  
               "Complaint nearing SLA deadline"  
         ↓  
Day \[SLA \+ 1\]  SLA breached  
               Red alert to Department Head  
               Complaint flagged OVERDUE on dashboard  
         ↓  
Day \[SLA \+ 3\]  Escalated to Municipal Commissioner  
               Full complaint history attached  
         ↓  
Day \[SLA \+ 7\]  Complaint appears on PUBLIC   
               "Long Pending" dashboard  
               Visible to all citizens without login

No human can stop this chain. It moves automatically regardless of who does or doesn't act.

---

### **STAGE 11 — Recurring Issue Flag**

Every time a complaint is resolved, system checks:

Has this GPS location (within 30m radius) had   
complaints of the same category resolved   
more than 3 times in the last 12 months?

YES →  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
⚠️  RECURRING ISSUE DETECTED  
Location: MG Road near Bus Stop  
Category: Pothole  
Repairs in last 12 months: 5  
Total repair cost logged: ₹28,500  
Recommendation: Structural assessment needed  
                Permanent reconstruction advised  
                Escalate to Planning Department  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
Automatically flagged to:  
→ Department Head  
→ Commissioner  
→ Planning/Infrastructure Cell

This flag stops the cycle of repeated patch jobs and forces a permanent solution conversation.

---

## **Complete Flow — One View**

CITIZEN                          SYSTEM                         AUTHORITY  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  
Opens app  
Takes photo/video/voice  
         ↓  
GPS auto-tagged              Complaint received  
Submit                  →    AI categorizes \+ severity  
                             Locality cluster check  
                             Priority score calculated  
                             Department \+ officer assigned    →   Officer notified  
                             Complaint ID generated  
         ↓                                                        ↓  
Citizen gets ID \+            SLA clock starts              Officer views on map  
confirmation                 Escalation timer starts            ↓  
         ↓                                                   Goes to site  
Status: Assigned        ←    Notification sent             Marks In Progress  
         ↓                                                        ↓  
Status: In Progress     ←    Notification sent             Uploads after photo  
                                                                  ↓  
                             AI verifies before vs after  
                             Recurring issue check  
         ↓                                                        ↓  
"Was it fixed?"         ←    Resolution notification        Complaint marked  
\[YES\] or \[NO\]                                               Resolved  
         ↓  
If NO → Dispute         →    Auto-reopens  
         escalates      →    Department Head alerted  
         ↓  
If YES → Closed              Data feeds analytics  
                             Department score updated

                             Recurring flag checked


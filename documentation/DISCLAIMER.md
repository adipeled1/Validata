# Disclaimer — Validata EDC


## DISCLAIMER

**This is a student academic project. It does not claim to be ICH E6(R3) compliant, GCP compliant, or suitable for use in a real regulated clinical trial.**

We are students at Braude College of Engineering. The ICH E6(R3)-inspired features in this project reflect what the guideline asks for at the *code level*. We wrote code that moves in the direction of those requirements. We do not claim that this code alone achieves compliance with the guideline or with any regulatory requirement.

**Compliance depends on things outside this repository:**

- **Infrastructure provider and plan.** Audit trail immutability, Point-in-Time Recovery, encryption at rest, and SOC 2 / ISO 27001 certification are properties of the database and hosting provider, not this code. This project references Supabase's free tier as the default implementation. The free tier does not include PITR, enhanced SLAs, or the same security guarantees available on paid plans. Achieving the retention and recovery requirements of ICH E6(R3) requires selecting and configuring a provider plan that actually provides those guarantees — and independently verifying that they hold.

- **Operational procedures.** GCP compliance requires written Standard Operating Procedures (SOPs), investigator training records, IRB approval, sponsor oversight agreements, monitoring plans, and ongoing validation programmes. None of those exist for this student project, and this codebase cannot create them for you.

- **Regulatory jurisdiction.** Requirements differ between the FDA (21 CFR Part 11), EMA, and other health authorities. This project does not target any specific regulatory submission pathway and has not been reviewed by any regulatory authority.

- **System validation.** A validated computerised system requires executed Installation Qualification (IQ), Operational Qualification (OQ), and Performance Qualification (PQ) test protocols, signed by qualified personnel, against a locked and controlled production environment. No such protocol has been executed, signed, or reviewed by any qualified person for this project.

- **Security audit.** This code has not undergone an independent penetration test or security audit. Do not rely on it to protect sensitive clinical data without an independent review.

**This is open-source software.** Under the terms of the project's open-source license, anyone is free to take this code, connect it to the infrastructure provider of their choice, and host it wherever they choose. We provide a specific reference implementation using Supabase (free tier) and Vercel. Achieving actual regulatory compliance on top of this codebase would require significant additional work, qualified regulatory and technical personnel, appropriate infrastructure commitments, and ongoing maintenance. The burden of that work falls on whoever deploys this software for actual use.

**Do not use this software for real regulated clinical trials without independent legal, regulatory, and technical review.**

---

## Open Source Notice

This project is provided as-is, without warranty of any kind, express or implied. The contributors make no representation that this software meets any regulatory requirement. Use at your own risk.

This project is licensed under the [Apache 2.0 License](../LICENSE).

---

## About This Project

| | |
|---|---|
| Institution | Braude College of Engineering, Karmiel, Israel |
| Departments | Software Engineering; Electrical and Electronics Engineering |
| Partner | Partner Medical Center |
| Project code | D-26-4-1 |
| Project title | Dorsiflexion Angle Measurement |
| Advisors | Dr. Naomi Unkelos Shpigel, Dr. Einat Ravid |
| Contributors | ororbach, liraztubul, adipeled1, shakedm341-lang, ofir2207 |


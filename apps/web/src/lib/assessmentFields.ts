export type FieldDef = { key: string; label: string; type: "text"|"textarea"|"date"|"select"; options?: string[] }
export type SectionDef = { title: string; fields: FieldDef[] }

export const OT_SECTIONS: SectionDef[] = [
  { title: "Case History", fields: [
    { key:"chiefComplaint", label:"Chief complaint / parents' concerns", type:"textarea" },
    { key:"referralSource", label:"Referral source", type:"text" },
  ]},
  { title: "Prenatal, Birth & Medical History", fields: [
    { key:"prenatalHistory", label:"Prenatal history (mother's health, medications)", type:"textarea" },
    { key:"birthHistory", label:"Birth history (delivery type, complications)", type:"textarea" },
    { key:"medicalHistory", label:"Medical history (past/present conditions, medications)", type:"textarea" },
  ]},
  { title: "Developmental Milestones", fields: [
    { key:"ageSitting", label:"Age sitting (months)", type:"text" },
    { key:"ageCrawling", label:"Age crawling (months)", type:"text" },
    { key:"ageStanding", label:"Age standing (months)", type:"text" },
    { key:"ageWalking", label:"Age walking (months)", type:"text" },
  ]},
  { title: "Gross Motor Skills", fields: [
    { key:"headControl", label:"Head control", type:"text" },
    { key:"rolling", label:"Rolling", type:"text" },
    { key:"trunkControl", label:"Trunk control", type:"text" },
    { key:"grossMotorNotes", label:"Additional observations", type:"textarea" },
  ]},
  { title: "Fine Motor Skills", fields: [
    { key:"eyeTracking", label:"Eye tracking", type:"text" },
    { key:"eyeHandCoordination", label:"Eye-hand coordination", type:"text" },
    { key:"graspRelease", label:"Reach / grasp / release", type:"text" },
  ]},
  { title: "ADL Skills", fields: [
    { key:"feeding", label:"Feeding", type:"text" },
    { key:"toileting", label:"Toileting", type:"text" },
    { key:"grooming", label:"Grooming", type:"text" },
  ]},
  { title: "Sensory Integration", fields: [
    { key:"tactile", label:"Tactile", type:"text" },
    { key:"vestibular", label:"Vestibular / equilibrium", type:"text" },
    { key:"proprioception", label:"Proprioception", type:"text" },
    { key:"auditory", label:"Auditory", type:"text" },
    { key:"visual", label:"Vision", type:"text" },
  ]},
  { title: "Neurological & Cognitive", fields: [
    { key:"muscleTone", label:"Muscle tone", type:"text" },
    { key:"reflexes", label:"Reflexes", type:"text" },
    { key:"cognitiveSkills", label:"Cognitive skills", type:"textarea" },
  ]},
  { title: "Problems & Objectives", fields: [
    { key:"problemsIdentified", label:"Problems identified", type:"textarea" },
    { key:"shortTermObjectives", label:"Short-term objectives", type:"textarea" },
    { key:"longTermObjectives", label:"Long-term objectives", type:"textarea" },
    { key:"homeProgramme", label:"Home programme", type:"textarea" },
  ]},
]

export const SLT_SECTIONS: SectionDef[] = [
  { title: "Case History", fields: [
    { key:"referralSource", label:"Referral source", type:"text" },
    { key:"otherClinics", label:"Other clinics attended", type:"text" },
    { key:"familySocialHistory", label:"Family social history", type:"textarea" },
    { key:"parentsConcerns", label:"Parents' concerns and expectations", type:"textarea" },
  ]},
  { title: "Prenatal, Birth & Medical History", fields: [
    { key:"prenatalHistory", label:"Prenatal history", type:"textarea" },
    { key:"birthHistory", label:"Birth history", type:"textarea" },
    { key:"medicalHistory", label:"Medical history", type:"textarea" },
  ]},
  { title: "Developmental Milestones", fields: [
    { key:"ageSitting", label:"Age sitting (months)", type:"text" },
    { key:"ageWalking", label:"Age walking (months)", type:"text" },
  ]},
  { title: "Language Development History", fields: [
    { key:"firstWords", label:"First words (age)", type:"text" },
    { key:"combiningWords", label:"Combining words (age)", type:"text" },
    { key:"askingQuestions", label:"Asking questions (age)", type:"text" },
    { key:"conversation", label:"Conversation ability", type:"textarea" },
  ]},
  { title: "Preverbal Skills", fields: [
    { key:"attention", label:"Attention", type:"text" },
    { key:"listening", label:"Listening", type:"text" },
    { key:"imitation", label:"Imitation", type:"text" },
    { key:"turnTaking", label:"Turn-taking", type:"text" },
    { key:"play", label:"Play skills", type:"text" },
  ]},
  { title: "Language Assessment", fields: [
    { key:"receptiveLanguage", label:"Receptive language", type:"textarea" },
    { key:"expressiveLanguage", label:"Expressive language", type:"textarea" },
    { key:"strengths", label:"Child's strengths", type:"textarea" },
  ]},
  { title: "SLT Impression & Plan", fields: [
    { key:"sltImpression", label:"SLT clinical impression", type:"textarea" },
    { key:"specialNotes", label:"Special notes (ASD / stammering / cleft lip-palate)", type:"textarea" },
    { key:"shortTermObjectives", label:"Short-term objectives", type:"textarea" },
    { key:"longTermObjectives", label:"Long-term objectives", type:"textarea" },
    { key:"homeProgramme", label:"Home programme", type:"textarea" },
  ]},
]
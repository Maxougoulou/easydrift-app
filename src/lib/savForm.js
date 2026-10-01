// ============================================================
// Questionnaire SAV « anneau défectueux » — source unique FR/EN.
// Utilisé par la page publique (saisie client) ET par l'espace
// admin (relecture des réponses) : une seule définition à maintenir.
// ============================================================

// Vidéo EASYDRIFT « comment mesurer la circonférence du pneu ».
// Remplacer par l'URL réelle de la vidéo si elle change.
export const TIRE_VIDEO_URL = 'https://www.youtube.com/@EasydriftOfficial';

// Petit helper : renvoie la chaîne dans la langue demandée.
export const t = (val, locale) => {
  if (val == null) return '';
  return typeof val === 'string' ? val : (val[locale] ?? val.fr ?? '');
};

const OTHER = { fr: 'Autre', en: 'Other' };

// ── Options réutilisées ──────────────────────────────────────────────────────

export const PRODUCTS = [
  { value: 'DTS56', label: 'EASYDRIFT 180×560 — DTS56' },
  { value: 'DTS60', label: 'EASYDRIFT 200×600 — DTS60' },
  { value: 'DTS66', label: 'EASYDRIFT 230×660 — DTS66' },
  { value: 'RS64',  label: 'EASYDRIFT 230×640 — RS64' },
  { value: 'TRUCK', label: 'EASYDRIFT Truck DTS' },
  { value: 'KTLG',  label: 'EASYDRIFT KTLG' },
  { value: 'KTHG',  label: 'EASYDRIFT KTHG' },
  { value: 'PROTO', label: { fr: 'EASYDRIFT produit spécial / prototype', en: 'EASYDRIFT special product / prototype' } },
  { value: 'autre', label: OTHER },
];

const WEATHER = [
  { value: 'sunny',      label: { fr: 'Soleil',       en: 'Sunny' },      icon: '☀' },
  { value: 'cloudy',     label: { fr: 'Nuageux',      en: 'Cloudy' },     icon: '☁' },
  { value: 'heavy_rain', label: { fr: 'Pluie forte',  en: 'Heavy rain' }, icon: '🌧' },
  { value: 'light_rain', label: { fr: 'Pluie légère', en: 'Light rain' }, icon: '🌦' },
  { value: 'snow',       label: { fr: 'Neige',        en: 'Snow' },       icon: '❄' },
  { value: 'fog',        label: { fr: 'Brouillard',   en: 'Fog' },        icon: '🌫' },
  { value: 'autre',      label: OTHER,                                    icon: '•' },
];

const SURFACE_TYPE = [
  { value: 'asphalt',  label: { fr: 'Asphalte', en: 'Asphalt' } },
  { value: 'concrete', label: { fr: 'Béton',    en: 'Concrete' } },
  { value: 'autre',    label: OTHER },
];

const SURFACE_CONDITION = [
  { value: 'clean',    label: { fr: 'Propre',                       en: 'Clean' } },
  { value: 'smooth',   label: { fr: 'Lisse',                        en: 'Smooth' } },
  { value: 'abrasive', label: { fr: 'Abrasive',                     en: 'Abrasive' } },
  { value: 'dusty',    label: { fr: 'Poussiéreuse ou sableuse',     en: 'Dusty or sandy' } },
  { value: 'gravel',   label: { fr: 'Gravillons / petits cailloux', en: 'Loose gravel / small rocks' } },
  { value: 'uneven',   label: { fr: 'Irrégulière',                  en: 'Unevenness' } },
  { value: 'potholes', label: { fr: 'Nids-de-poule',                en: 'Potholes' } },
  { value: 'curbs',    label: { fr: 'Bordures / trottoirs',         en: 'Curbs' } },
  { value: 'autre',    label: OTHER },
];

const DRIVETRAIN = [
  { value: 'fwd', label: { fr: 'Traction (avant)',             en: 'Front wheel drive' } },
  { value: 'rwd', label: { fr: 'Propulsion (arrière)',         en: 'Rear wheel drive' } },
  { value: '4wd', label: { fr: '4 roues motrices (4WD)',       en: 'Four wheel drive' } },
  { value: 'awd', label: { fr: 'Transmission intégrale (AWD)', en: 'All wheel drive' } },
];

export const MOUNT_POSITIONS = [
  { value: 'front_left',  label: { fr: 'Avant gauche',   en: 'Front left' } },
  { value: 'front_right', label: { fr: 'Avant droit',    en: 'Front right' } },
  { value: 'rear_left',   label: { fr: 'Arrière gauche', en: 'Rear left' } },
  { value: 'rear_right',  label: { fr: 'Arrière droit',  en: 'Rear right' } },
];

// ── Étapes du questionnaire ──────────────────────────────────────────────────
// type : text | email | date | textarea | yesno | radio | chips | scale |
//        files | temperature | wheels | ringDiagram | videoLink
// allowOther : ajoute un champ libre « <id>_autre » quand « autre » est choisi.

export const STEPS = [
  {
    id: 'contact',
    icon: '👤',
    title: { fr: 'Vos coordonnées', en: 'Your details' },
    subtitle: { fr: 'Pour vous recontacter au sujet de cet anneau.', en: 'So we can get back to you about this ring.' },
    fields: [
      {
        id: 'email', type: 'email', required: true,
        label: { fr: 'Adresse e-mail', en: 'Email address' },
        placeholder: { fr: 'vous@societe.com', en: 'you@company.com' },
      },
      {
        id: 'nom_poste', type: 'text', required: true,
        label: { fr: 'Nom et fonction', en: 'Your name and position' },
        placeholder: { fr: 'Jean Dupont — chef mécanicien', en: 'John Smith — head mechanic' },
      },
      {
        id: 'societe', type: 'text', required: true,
        label: { fr: 'Société / organisation / école', en: 'Organisation / company / school' },
      },
      {
        id: 'date_incident', type: 'date', required: true,
        label: { fr: 'Date de l’incident', en: 'Date of the incident' },
      },
      {
        id: 'premiere_utilisation', type: 'yesno', required: true,
        label: { fr: 'Première utilisation du système EASYDRIFT ?', en: 'Is it your first time using the EASYDRIFT system?' },
      },
    ],
  },

  {
    id: 'produit',
    icon: '⭕',
    title: { fr: 'Produit concerné', en: 'Product concerned' },
    subtitle: { fr: 'Identifiez l’anneau et relevez ses marquages de fabrication.', en: 'Identify the ring and record its manufacturing markings.' },
    fields: [
      {
        id: 'produit', type: 'radio', required: true, options: PRODUCTS, allowOther: true,
        label: { fr: 'Quel produit est concerné ?', en: 'Which product is concerned?' },
      },
      { id: '_ring_diagram', type: 'ringDiagram' },
      {
        id: 'photo_casting', type: 'files', required: true, max: 2, accept: 'image/*',
        label: { fr: 'Photo — date et heure de coulée', en: 'Photo — casting reference date and hour' },
        hint: { fr: 'Marquage en creux sur le flanc de l’anneau (ex. 08-11-2018 / 10:51).', en: 'Recessed marking on the side of the ring (e.g. 08-11-2018 / 10:51).' },
      },
      {
        id: 'photo_machining', type: 'files', required: true, max: 2, accept: 'image/*',
        label: { fr: 'Photo — date d’usinage', en: 'Photo — machining date' },
        hint: { fr: 'Second marquage, un peu plus loin sur le même flanc.', en: 'Second marking, slightly further along the same side.' },
      },
    ],
  },

  {
    id: 'conditions',
    icon: '🌦',
    title: { fr: 'Conditions de l’incident', en: 'Conditions of the incident' },
    subtitle: { fr: 'Météo et revêtement au moment de la casse.', en: 'Weather and surface at the time of the failure.' },
    fields: [
      {
        id: 'temperature', type: 'temperature',
        label: { fr: 'Température extérieure', en: 'Outside temperature' },
      },
      {
        id: 'meteo', type: 'chips', options: WEATHER, allowOther: true,
        label: { fr: 'Conditions météo', en: 'Weather conditions' },
        hint: { fr: 'Plusieurs choix possibles.', en: 'Select all that apply.' },
      },
      {
        id: 'surface_type', type: 'radio', required: true, options: SURFACE_TYPE, allowOther: true,
        label: { fr: 'Type de revêtement', en: 'Driving surface type' },
      },
      {
        id: 'surface_condition', type: 'chips', required: true, options: SURFACE_CONDITION, allowOther: true,
        label: { fr: 'État du revêtement', en: 'Driving surface condition' },
        hint: { fr: 'Plusieurs choix possibles.', en: 'Select all that apply.' },
      },
      {
        id: 'photo_surface', type: 'files', max: 5, accept: 'image/*',
        label: { fr: 'Photos du revêtement', en: 'Pictures of the driving surface' },
        hint: { fr: 'Facultatif, mais très utile pour l’analyse.', en: 'Optional, but very useful for the analysis.' },
      },
    ],
  },

  {
    id: 'anneau',
    icon: '🛞',
    title: { fr: 'Anneau & pneu support', en: 'Ring & support tire' },
    subtitle: { fr: 'L’usure et le pneu utilisé expliquent beaucoup de casses.', en: 'Wear and the tire used explain many failures.' },
    fields: [
      {
        id: 'usure_dts', type: 'scale', required: true, min: 0, max: 10,
        label: { fr: 'Usure de l’anneau DTS', en: 'DTS wear' },
        minLabel: { fr: 'Neuf', en: 'New' },
        maxLabel: { fr: 'Usé', en: 'Used' },
      },
      {
        id: 'pneu_marque', type: 'text', required: true,
        label: { fr: 'Marque et modèle du pneu support', en: 'Support tire brand and model' },
      },
      {
        id: 'pneu_taille', type: 'text', required: true,
        label: { fr: 'Dimensions du pneu support', en: 'Support tire size' },
        placeholder: { fr: 'ex. 195/65 R15', en: 'e.g. 195/65 R15' },
      },
      {
        id: 'pneu_premiere_utilisation', type: 'yesno', required: true,
        label: { fr: 'Première utilisation de ce pneu support ?', en: 'Is it your first time using this support tire?' },
      },
      {
        id: 'pneu_pression', type: 'text', required: true,
        label: { fr: 'Pression du pneu lors de l’incident', en: 'Tire pressure during the incident' },
        placeholder: { fr: 'ex. 2,5 bar / 36 psi', en: 'e.g. 2.5 bar / 36 psi' },
      },
      {
        id: '_video', type: 'videoLink',
        label: { fr: 'Comment mesurer la circonférence ?', en: 'How to measure the circumference?' },
      },
      {
        id: 'circonference_degonfle', type: 'text',
        label: { fr: 'Circonférence pneu dégonflé', en: 'Tire circumference when deflated' },
      },
      {
        id: 'circonference_nominale', type: 'text',
        label: { fr: 'Circonférence à pression nominale', en: 'Tire circumference at nominal pressure' },
      },
    ],
  },

  {
    id: 'vehicule',
    icon: '🚗',
    title: { fr: 'Véhicule', en: 'Vehicle' },
    subtitle: { fr: 'Le véhicule et la position de montage de l’anneau.', en: 'The vehicle and where the ring was mounted.' },
    fields: [
      {
        id: 'vehicule', type: 'text', required: true,
        label: { fr: 'Année, marque et modèle du véhicule', en: 'Year, make and model of the vehicle' },
        placeholder: { fr: 'ex. 2008 BMW E92 335i', en: 'e.g. 2008 BMW E92 335i' },
      },
      {
        id: 'vehicule_premiere_utilisation', type: 'yesno', required: true,
        label: { fr: 'Première utilisation de ce véhicule précis ?', en: 'Is it your first time using this particular car?' },
      },
      {
        id: 'transmission', type: 'radio', options: DRIVETRAIN,
        label: { fr: 'Transmission', en: 'Vehicle power distribution' },
      },
      {
        id: 'position_dts', type: 'wheels', required: true,
        label: { fr: 'Où l’anneau DTS était-il monté ?', en: 'Where was the DTS mounted?' },
        hint: { fr: 'Touchez la roue concernée.', en: 'Tap the wheel concerned.' },
      },
      {
        id: 'poids', type: 'text',
        label: { fr: 'Poids approximatif du véhicule', en: 'Approximate weight of the car' },
        placeholder: { fr: 'ex. 1500 kg', en: 'e.g. 1500 kg' },
      },
      {
        id: 'photo_vehicule', type: 'files', max: 5, accept: 'image/*',
        label: { fr: 'Photos du véhicule', en: 'Pictures of the car used' },
      },
    ],
  },

  {
    id: 'incident',
    icon: '💥',
    title: { fr: 'Description de l’incident', en: 'Incident description' },
    subtitle: { fr: 'Dernière étape — racontez-nous ce qui s’est passé.', en: 'Last step — tell us what happened.' },
    fields: [
      {
        id: 'description', type: 'textarea', required: true, rows: 5,
        label: { fr: 'Que s’est-il passé ?', en: 'Brief description of the incident' },
        placeholder: {
          fr: 'Vitesse, manœuvre en cours, bruit entendu, durée d’utilisation de l’anneau avant la casse…',
          en: 'Speed, manoeuvre in progress, noise heard, how long the ring had been used before failure…',
        },
      },
      {
        id: 'photos_casse', type: 'files', required: true, max: 10, accept: 'image/*,video/*,application/pdf',
        label: { fr: 'Photos ou vidéos de l’anneau cassé', en: 'Pictures or video of the broken DTS' },
        hint: { fr: '10 fichiers maximum. Photos nettes de la zone de rupture, de près et de loin.', en: 'Up to 10 files. Sharp photos of the break area, close up and from a distance.' },
      },
      {
        id: 'observations', type: 'textarea', rows: 3,
        label: { fr: 'Observations / remarques', en: 'Observations / notes' },
        hint: { fr: 'Facultatif.', en: 'Optional.' },
      },
    ],
  },
];

// Champs purement illustratifs : pas de réponse à stocker.
const DISPLAY_ONLY = ['ringDiagram', 'videoLink'];
export const isDisplayField = (f) => DISPLAY_ONLY.includes(f.type);
export const isFileField = (f) => f.type === 'files';

// Toutes les questions à plat, pratique pour la relecture admin.
export const ALL_FIELDS = STEPS.flatMap(s => s.fields.filter(f => !isDisplayField(f)));

// ── Rendu lisible d'une réponse (espace admin) ───────────────────────────────
export function formatAnswer(field, reponses, locale = 'fr') {
  const v = reponses?.[field.id];
  const autre = reponses?.[`${field.id}_autre`];

  if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return null;

  const optLabel = (val) => {
    const o = field.options?.find(o => o.value === val);
    if (!o) return val;
    if (val === 'autre' && autre) return `${t(o.label, locale)} : ${autre}`;
    return t(o.label, locale);
  };

  switch (field.type) {
    case 'yesno':
      return v === 'yes' ? (locale === 'fr' ? 'Oui' : 'Yes') : (locale === 'fr' ? 'Non' : 'No');
    case 'radio':
      return optLabel(v);
    case 'chips':
      return (Array.isArray(v) ? v : [v]).map(optLabel).join(', ');
    case 'scale':
      return `${v} / ${field.max}`;
    case 'temperature':
      return typeof v === 'object' ? `${v.value} °${v.unit ?? 'C'}` : String(v);
    case 'wheels': {
      const p = MOUNT_POSITIONS.find(p => p.value === v);
      return p ? t(p.label, locale) : v;
    }
    case 'date':
      return new Date(v).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-GB');
    default:
      return String(v);
  }
}

// ── Textes d'interface du formulaire public ──────────────────────────────────
export const UI = {
  brandLine:    { fr: 'Déclaration d’anneau défectueux', en: 'Defective ring report' },
  introTitle:   { fr: 'Nous sommes désolés pour cet incident', en: 'We are sorry about this incident' },
  introBody: {
    fr: 'Votre retour est essentiel : il part directement à nos ingénieurs pour comprendre l’origine de la casse et améliorer nos anneaux. Plus vos réponses sont précises, plus l’analyse est fiable. Rien de ce que vous déclarez ici ne vous sera reproché.',
    en: 'Your feedback goes straight to our engineers so they can understand the cause of the failure and improve our rings. The more precise your answers, the more reliable the analysis. Nothing you report here will ever be held against you.',
  },
  introTime:    { fr: '≈ 8 minutes · photos nécessaires', en: '≈ 8 minutes · photos required' },
  introStart:   { fr: 'Commencer', en: 'Start' },
  introTip:     { fr: 'Préparez votre téléphone : plusieurs photos de l’anneau vous seront demandées.', en: 'Have your phone ready: several photos of the ring will be requested.' },
  step:         { fr: 'Étape', en: 'Step' },
  of:           { fr: 'sur', en: 'of' },
  next:         { fr: 'Suivant', en: 'Next' },
  back:         { fr: 'Retour', en: 'Back' },
  submit:       { fr: 'Envoyer le rapport', en: 'Send the report' },
  sending:      { fr: 'Envoi en cours…', en: 'Sending…' },
  required:     { fr: 'Obligatoire', en: 'Required' },
  errRequired:  { fr: 'Merci de compléter ce champ.', en: 'Please complete this field.' },
  errEmail:     { fr: 'Adresse e-mail invalide.', en: 'Invalid email address.' },
  errStep:      { fr: 'Il manque des informations sur cette étape.', en: 'Some information is missing on this step.' },
  errSubmit:    { fr: 'L’envoi a échoué. Vérifiez votre connexion et réessayez.', en: 'Sending failed. Check your connection and try again.' },
  addFiles:     { fr: 'Ajouter des photos', en: 'Add photos' },
  addFile:      { fr: 'Ajouter une photo', en: 'Add a photo' },
  uploading:    { fr: 'Envoi…', en: 'Uploading…' },
  fileTooBig:   { fr: 'Fichier trop lourd (100 Mo maximum).', en: 'File too large (100 MB maximum).' },
  uploadFailed: { fr: 'Échec de l’envoi du fichier.', en: 'File upload failed.' },
  maxFiles:     { fr: 'Nombre maximum de fichiers atteint.', en: 'Maximum number of files reached.' },
  yes:          { fr: 'Oui', en: 'Yes' },
  no:           { fr: 'Non', en: 'No' },
  otherSpec:    { fr: 'Précisez…', en: 'Please specify…' },
  draftSaved:   { fr: 'Brouillon enregistré sur cet appareil', en: 'Draft saved on this device' },
  watchVideo:   { fr: 'Voir la vidéo', en: 'Watch the video' },
  ringHelp:     { fr: 'Les deux marquages sont gravés en creux sur le flanc de l’anneau.', en: 'Both markings are recessed on the side of the ring.' },
  castingTag:   { fr: 'Date + heure de coulée', en: 'Casting date + hour' },
  machiningTag: { fr: 'Date d’usinage', en: 'Machining date' },
  doneTitle:    { fr: 'Rapport envoyé, merci !', en: 'Report sent, thank you!' },
  doneBody:     { fr: 'Nos ingénieurs ont bien reçu votre déclaration. Nous revenons vers vous par e-mail dès que l’analyse est terminée.', en: 'Our engineers have received your report. We will come back to you by email as soon as the analysis is complete.' },
  alreadyTitle: { fr: 'Ce formulaire a déjà été rempli', en: 'This form has already been completed' },
  alreadyBody:  { fr: 'Votre déclaration nous est bien parvenue. Pour signaler un autre anneau, demandez-nous un nouveau lien.', en: 'Your report has reached us. To report another ring, please ask us for a new link.' },
  nfTitle:      { fr: 'Lien invalide', en: 'Invalid link' },
  nfBody:       { fr: 'Ce lien ne correspond à aucune déclaration. Vérifiez l’adresse ou demandez-nous un nouveau lien.', en: 'This link does not match any report. Please check the address or ask us for a new link.' },
  loading:      { fr: 'Chargement…', en: 'Loading…' },
};

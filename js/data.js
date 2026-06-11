// ============================================================
//  MediCore HMS — Shared Data Store
// ============================================================

const HMS = (() => {
  // ── Seed data ──────────────────────────────────────────────

  const defaultPatients = [
    { id:'P-1001', name:'Arjun Sharma',    age:42, gender:'Male',   blood:'B+',  phone:'9876543210', dept:'Cardiology',    status:'Active',     admitted:'2026-05-12', doctor:'Dr. Priya Nair' },
    { id:'P-1002', name:'Meena Patel',     age:35, gender:'Female', blood:'O+',  phone:'9812345678', dept:'Orthopedics',   status:'Admitted',   admitted:'2026-05-20', doctor:'Dr. Rahul Sen' },
    { id:'P-1003', name:'Suresh Kumar',    age:60, gender:'Male',   blood:'A-',  phone:'9900112233', dept:'Neurology',     status:'Critical',   admitted:'2026-05-28', doctor:'Dr. Anita Roy' },
    { id:'P-1004', name:'Lakshmi Iyer',    age:29, gender:'Female', blood:'AB+', phone:'9123456780', dept:'Gynecology',    status:'Active',     admitted:'2026-05-30', doctor:'Dr. Priya Nair' },
    { id:'P-1005', name:'Ravi Menon',      age:54, gender:'Male',   blood:'O-',  phone:'9988776655', dept:'Cardiology',    status:'Discharged', admitted:'2026-05-01', doctor:'Dr. Rahul Sen' },
    { id:'P-1006', name:'Kavitha Reddy',   age:47, gender:'Female', blood:'B-',  phone:'9871234567', dept:'Oncology',      status:'Admitted',   admitted:'2026-05-22', doctor:'Dr. Anita Roy' },
    { id:'P-1007', name:'Deepak Gupta',    age:33, gender:'Male',   blood:'A+',  phone:'9001234567', dept:'Dermatology',   status:'Active',     admitted:'2026-05-31', doctor:'Dr. Kiran Das' },
    { id:'P-1008', name:'Pooja Nair',      age:25, gender:'Female', blood:'O+',  phone:'9543217890', dept:'Pediatrics',    status:'Discharged', admitted:'2026-04-28', doctor:'Dr. Priya Nair' },
    { id:'P-1009', name:'Vikram Singh',    age:67, gender:'Male',   blood:'B+',  phone:'9765432109', dept:'Urology',       status:'Critical',   admitted:'2026-05-25', doctor:'Dr. Rahul Sen' },
    { id:'P-1010', name:'Ananya Das',      age:38, gender:'Female', blood:'A-',  phone:'9234567891', dept:'ENT',           status:'Active',     admitted:'2026-06-01', doctor:'Dr. Kiran Das' },
    { id:'P-1011', name:'Rahul Verma',     age:52, gender:'Male',   blood:'AB-', phone:'9887654321', dept:'Gastroenterology', status:'Admitted', admitted:'2026-05-29', doctor:'Dr. Anita Roy' },
    { id:'P-1012', name:'Sunita Joshi',    age:44, gender:'Female', blood:'O+',  phone:'9345678902', dept:'Cardiology',    status:'Active',     admitted:'2026-05-15', doctor:'Dr. Priya Nair' },
  ];

  const defaultDoctors = [
    { id:'D-001', name:'Dr. Priya Nair',    specialization:'Cardiology',      dept:'Cardiology',       phone:'9876001122', email:'priya.nair@medicore.in',    experience:14, status:'Active',   fee:800,  schedule:'Mon–Fri', patients:87 },
    { id:'D-002', name:'Dr. Rahul Sen',     specialization:'Orthopedics',     dept:'Orthopedics',      phone:'9876002233', email:'rahul.sen@medicore.in',     experience:9,  status:'Active',   fee:700,  schedule:'Mon–Sat', patients:64 },
    { id:'D-003', name:'Dr. Anita Roy',     specialization:'Neurology',       dept:'Neurology',        phone:'9876003344', email:'anita.roy@medicore.in',     experience:17, status:'Active',   fee:900,  schedule:'Tue–Sat', patients:103 },
    { id:'D-004', name:'Dr. Kiran Das',     specialization:'Dermatology',     dept:'Dermatology',      phone:'9876004455', email:'kiran.das@medicore.in',     experience:6,  status:'Active',   fee:600,  schedule:'Mon–Fri', patients:42 },
    { id:'D-005', name:'Dr. Sanjay Mehta',  specialization:'Oncology',        dept:'Oncology',         phone:'9876005566', email:'sanjay.mehta@medicore.in',  experience:20, status:'Active',   fee:1100, schedule:'Mon–Fri', patients:56 },
    { id:'D-006', name:'Dr. Divya Rao',     specialization:'Gynecology',      dept:'Gynecology',       phone:'9876006677', email:'divya.rao@medicore.in',     experience:12, status:'Active',   fee:750,  schedule:'Mon–Sat', patients:78 },
    { id:'D-007', name:'Dr. Arjun Bose',    specialization:'Pediatrics',      dept:'Pediatrics',       phone:'9876007788', email:'arjun.bose@medicore.in',    experience:8,  status:'On Leave', fee:650,  schedule:'Mon–Fri', patients:91 },
    { id:'D-008', name:'Dr. Leena Pillai',  specialization:'ENT',             dept:'ENT',              phone:'9876008899', email:'leena.pillai@medicore.in',  experience:11, status:'Active',   fee:600,  schedule:'Tue–Sat', patients:47 },
    { id:'D-009', name:'Dr. Nitin Jain',    specialization:'Urology',         dept:'Urology',          phone:'9876009900', email:'nitin.jain@medicore.in',    experience:15, status:'Active',   fee:800,  schedule:'Mon–Fri', patients:39 },
    { id:'D-010', name:'Dr. Pooja Sharma',  specialization:'Gastroenterology',dept:'Gastroenterology', phone:'9876010011', email:'pooja.sharma@medicore.in',  experience:7,  status:'Active',   fee:700,  schedule:'Mon–Sat', patients:55 },
  ];

  const defaultAppointments = [
    { id:'A-001', patient:'Arjun Sharma',   patientId:'P-1001', doctor:'Dr. Priya Nair',   dept:'Cardiology',    date:'2026-06-01', time:'09:00', type:'Follow-up',    status:'Confirmed', notes:'' },
    { id:'A-002', patient:'Meena Patel',    patientId:'P-1002', doctor:'Dr. Rahul Sen',    dept:'Orthopedics',   date:'2026-06-01', time:'09:30', type:'Consultation', status:'Confirmed', notes:'' },
    { id:'A-003', patient:'Suresh Kumar',   patientId:'P-1003', doctor:'Dr. Anita Roy',    dept:'Neurology',     date:'2026-06-01', time:'10:00', type:'Emergency',    status:'Confirmed', notes:'Priority' },
    { id:'A-004', patient:'Lakshmi Iyer',   patientId:'P-1004', doctor:'Dr. Divya Rao',    dept:'Gynecology',    date:'2026-06-01', time:'10:30', type:'Routine',      status:'Pending',   notes:'' },
    { id:'A-005', patient:'Ravi Menon',     patientId:'P-1005', doctor:'Dr. Priya Nair',   dept:'Cardiology',    date:'2026-06-01', time:'11:00', type:'Consultation', status:'Cancelled', notes:'' },
    { id:'A-006', patient:'Kavitha Reddy',  patientId:'P-1006', doctor:'Dr. Sanjay Mehta', dept:'Oncology',      date:'2026-06-01', time:'11:30', type:'Follow-up',    status:'Confirmed', notes:'' },
    { id:'A-007', patient:'Deepak Gupta',   patientId:'P-1007', doctor:'Dr. Kiran Das',    dept:'Dermatology',   date:'2026-06-01', time:'14:00', type:'Consultation', status:'Confirmed', notes:'' },
    { id:'A-008', patient:'Pooja Nair',     patientId:'P-1008', doctor:'Dr. Anita Roy',    dept:'Neurology',     date:'2026-06-02', time:'09:00', type:'Routine',      status:'Pending',   notes:'' },
    { id:'A-009', patient:'Vikram Singh',   patientId:'P-1009', doctor:'Dr. Nitin Jain',   dept:'Urology',       date:'2026-06-02', time:'10:30', type:'Follow-up',    status:'Confirmed', notes:'' },
    { id:'A-010', patient:'Ananya Das',     patientId:'P-1010', doctor:'Dr. Leena Pillai', dept:'ENT',           date:'2026-06-02', time:'11:00', type:'Consultation', status:'Pending',   notes:'' },
  ];

  const defaultBills = [
    { id:'B-1001', patient:'Arjun Sharma',  patientId:'P-1001', date:'2026-05-28', items:[{name:'Consultation',fee:800},{name:'ECG',fee:400},{name:'Medicines',fee:620}],       paid:true,  payMode:'UPI' },
    { id:'B-1002', patient:'Meena Patel',   patientId:'P-1002', date:'2026-05-30', items:[{name:'Consultation',fee:700},{name:'X-Ray',fee:500},{name:'Physio Session',fee:800}], paid:false, payMode:'' },
    { id:'B-1003', patient:'Suresh Kumar',  patientId:'P-1003', date:'2026-05-31', items:[{name:'Consultation',fee:900},{name:'MRI',fee:3500},{name:'ICU Charges',fee:5000}],    paid:false, payMode:'' },
    { id:'B-1004', patient:'Lakshmi Iyer',  patientId:'P-1004', date:'2026-05-31', items:[{name:'Consultation',fee:750},{name:'Ultrasound',fee:600}],                            paid:true,  payMode:'Card' },
    { id:'B-1005', patient:'Ravi Menon',    patientId:'P-1005', date:'2026-05-15', items:[{name:'Consultation',fee:800},{name:'Angiography',fee:8000},{name:'Medicines',fee:1200}], paid:true, payMode:'Cash' },
    { id:'B-1006', patient:'Kavitha Reddy', patientId:'P-1006', date:'2026-06-01', items:[{name:'Consultation',fee:1100},{name:'Chemo Session',fee:12000},{name:'Lab Tests',fee:2400}], paid:false, payMode:'' },
  ];

  const defaultMedicines = [
    { id:'M-001', name:'Amoxicillin 500mg',   category:'Antibiotic',    stock:45,   minStock:50,  price:12,  unit:'Strip' },
    { id:'M-002', name:'Paracetamol 650mg',   category:'Analgesic',     stock:280,  minStock:100, price:5,   unit:'Strip' },
    { id:'M-003', name:'Metformin 500mg',      category:'Antidiabetic',  stock:130,  minStock:80,  price:8,   unit:'Strip' },
    { id:'M-004', name:'Atorvastatin 20mg',    category:'Statin',        stock:95,   minStock:60,  price:18,  unit:'Strip' },
    { id:'M-005', name:'Omeprazole 20mg',      category:'PPI',           stock:210,  minStock:100, price:10,  unit:'Strip' },
    { id:'M-006', name:'Azithromycin 250mg',   category:'Antibiotic',    stock:70,   minStock:50,  price:22,  unit:'Strip' },
    { id:'M-007', name:'Amlodipine 5mg',       category:'Antihypertensive',stock:160, minStock:80, price:6,   unit:'Strip' },
    { id:'M-008', name:'Losartan 50mg',        category:'Antihypertensive',stock:115, minStock:80, price:14,  unit:'Strip' },
    { id:'M-009', name:'Dolo 650',             category:'Analgesic',     stock:400,  minStock:150, price:4,   unit:'Strip' },
    { id:'M-010', name:'Cetirizine 10mg',      category:'Antihistamine', stock:190,  minStock:100, price:3,   unit:'Strip' },
    { id:'M-011', name:'Insulin Glargine',     category:'Antidiabetic',  stock:22,   minStock:30,  price:420, unit:'Vial'  },
    { id:'M-012', name:'IV Saline 500ml',      category:'IV Fluid',      stock:60,   minStock:40,  price:38,  unit:'Bottle'},
  ];

  const defaultWards = [
    { id:'W-001', name:'General Ward A',   type:'General',   capacity:20, occupied:14, floor:1 },
    { id:'W-002', name:'General Ward B',   type:'General',   capacity:20, occupied:18, floor:1 },
    { id:'W-003', name:'ICU',              type:'ICU',       capacity:10, occupied:8,  floor:2 },
    { id:'W-004', name:'Cardiac ICU',      type:'ICU',       capacity:8,  occupied:5,  floor:2 },
    { id:'W-005', name:'Maternity Ward',   type:'Maternity', capacity:15, occupied:9,  floor:3 },
    { id:'W-006', name:'Pediatric Ward',   type:'Pediatric', capacity:12, occupied:7,  floor:3 },
    { id:'W-007', name:'Oncology Ward',    type:'Specialty', capacity:10, occupied:6,  floor:4 },
    { id:'W-008', name:'Private Rooms',    type:'Private',   capacity:20, occupied:11, floor:4 },
  ];

  // ── LocalStorage helpers ──────────────────────────────────
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem('hms_' + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function save(key, data) {
    localStorage.setItem('hms_' + key, JSON.stringify(data));
  }

  // ── Public data getters/setters ───────────────────────────
  function getPatients()     { return load('patients', defaultPatients); }
  function savePatients(d)   { save('patients', d); }

  function getDoctors()      { return load('doctors', defaultDoctors); }
  function saveDoctors(d)    { save('doctors', d); }

  function getAppointments() { return load('appointments', defaultAppointments); }
  function saveAppointments(d){ save('appointments', d); }

  function getBills()        { return load('bills', defaultBills); }
  function saveBills(d)      { save('bills', d); }

  function getMedicines()    { return load('medicines', defaultMedicines); }
  function saveMedicines(d)  { save('medicines', d); }

  function getWards()        { return load('wards', defaultWards); }
  function saveWards(d)      { save('wards', d); }

  // ── Utility ──────────────────────────────────────────────
  function generateId(prefix, list) {
    const nums = list.map(i => parseInt(i.id.replace(prefix+'-',''))).filter(n=>!isNaN(n));
    const next = nums.length ? Math.max(...nums)+1 : 1;
    return prefix+'-'+String(next).padStart(3,'0');
  }

  function avatarColor(name) {
    const colors = [
      '#00d4aa','#ff5e7e','#ffb547','#a78bfa',
      '#4da6ff','#f97316','#06b6d4','#8b5cf6'
    ];
    let h = 0;
    for (let c of (name||'')) h = (h*31 + c.charCodeAt(0)) & 0xffff;
    return colors[h % colors.length];
  }

  function initials(name) {
    return (name||'??').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  }

  function showToast(msg, type='success') {
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.innerHTML = (type==='success'?'✓ ':type==='error'?'✕ ':'') + msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function formatDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  }

  function formatCurrency(n) {
    return '₹ ' + Number(n).toLocaleString('en-IN');
  }

  return {
    getPatients, savePatients,
    getDoctors, saveDoctors,
    getAppointments, saveAppointments,
    getBills, saveBills,
    getMedicines, saveMedicines,
    getWards, saveWards,
    generateId, avatarColor, initials,
    showToast, formatDate, formatCurrency
  };
})();

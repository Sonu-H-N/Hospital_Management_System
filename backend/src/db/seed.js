/* eslint-disable no-console */
// Populates demo staff accounts (one per role) and realistic sample data.
// Safe to re-run — wipes and recreates all seeded tables.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./index");
const { nextId } = require("../services/idGenerator");

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function daysFromNow(n) {
  return daysAgo(-n);
}

const DEMO_USERS = [
  { name: "Dr. Admin", email: "admin@medicore.in", password: "admin1234", role: "Admin" },
  { name: "Dr. Priya Nair", email: "priya.nair@medicore.in", password: "doctor1234", role: "Doctor" },
  { name: "Ravi Desk", email: "reception@medicore.in", password: "reception1234", role: "Receptionist" },
  { name: "Anu Pillai", email: "pharmacy@medicore.in", password: "pharmacy1234", role: "Pharmacist" },
];

function run() {
  console.log("Wiping existing seeded data…");
  db.exec(`
    DELETE FROM bill_items; DELETE FROM bills;
    DELETE FROM appointments; DELETE FROM patients; DELETE FROM doctors;
    DELETE FROM medicines; DELETE FROM wards; DELETE FROM users; DELETE FROM counters;
  `);

  console.log("Creating demo staff accounts…");
  const insertUser = db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)");
  for (const u of DEMO_USERS) {
    insertUser.run(u.name, u.email, bcrypt.hashSync(u.password, 12), u.role);
  }

  console.log("Seeding doctors…");
  const doctors = [
    { name: "Dr. Priya Nair", specialization: "Cardiology", dept: "Cardiology", phone: "9876001122", email: "priya.nair@medicore.in", experience: 14, status: "Active", fee: 800, schedule: "Mon–Fri" },
    { name: "Dr. Rahul Sen", specialization: "Orthopedics", dept: "Orthopedics", phone: "9876002233", email: "rahul.sen@medicore.in", experience: 9, status: "Active", fee: 700, schedule: "Mon–Sat" },
    { name: "Dr. Anita Roy", specialization: "Neurology", dept: "Neurology", phone: "9876003344", email: "anita.roy@medicore.in", experience: 17, status: "Active", fee: 900, schedule: "Tue–Sat" },
    { name: "Dr. Kiran Das", specialization: "Dermatology", dept: "Dermatology", phone: "9876004455", email: "kiran.das@medicore.in", experience: 6, status: "Active", fee: 600, schedule: "Mon–Fri" },
    { name: "Dr. Sanjay Mehta", specialization: "Oncology", dept: "Oncology", phone: "9876005566", email: "sanjay.mehta@medicore.in", experience: 20, status: "Active", fee: 1100, schedule: "Mon–Fri" },
    { name: "Dr. Divya Rao", specialization: "Gynecology", dept: "Gynecology", phone: "9876006677", email: "divya.rao@medicore.in", experience: 12, status: "Active", fee: 750, schedule: "Mon–Sat" },
    { name: "Dr. Arjun Bose", specialization: "Pediatrics", dept: "Pediatrics", phone: "9876007788", email: "arjun.bose@medicore.in", experience: 8, status: "On Leave", fee: 650, schedule: "Mon–Fri" },
    { name: "Dr. Leena Pillai", specialization: "ENT", dept: "ENT", phone: "9876008899", email: "leena.pillai@medicore.in", experience: 11, status: "Active", fee: 600, schedule: "Tue–Sat" },
    { name: "Dr. Nitin Jain", specialization: "Urology", dept: "Urology", phone: "9876009900", email: "nitin.jain@medicore.in", experience: 15, status: "Active", fee: 800, schedule: "Mon–Fri" },
    { name: "Dr. Pooja Sharma", specialization: "Gastroenterology", dept: "Gastroenterology", phone: "9876010011", email: "pooja.sharma@medicore.in", experience: 7, status: "Active", fee: 700, schedule: "Mon–Sat" },
  ];
  const insertDoctor = db.prepare(
    `INSERT INTO doctors (id, name, specialization, dept, phone, email, experience, status, fee, schedule) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const doctorIdByName = {};
  for (const d of doctors) {
    const id = nextId("D", "doctors");
    insertDoctor.run(id, d.name, d.specialization, d.dept, d.phone, d.email, d.experience, d.status, d.fee, d.schedule);
    doctorIdByName[d.name] = id;
  }

  console.log("Seeding patients…");
  const patients = [
    { name: "Arjun Sharma", age: 42, gender: "Male", blood_group: "B+", phone: "9876543210", dept: "Cardiology", status: "Active", admitted_on: daysAgo(20), doctor: "Dr. Priya Nair" },
    { name: "Meena Patel", age: 35, gender: "Female", blood_group: "O+", phone: "9812345678", dept: "Orthopedics", status: "Admitted", admitted_on: daysAgo(12), doctor: "Dr. Rahul Sen" },
    { name: "Suresh Kumar", age: 60, gender: "Male", blood_group: "A-", phone: "9900112233", dept: "Neurology", status: "Critical", admitted_on: daysAgo(4), doctor: "Dr. Anita Roy" },
    { name: "Lakshmi Iyer", age: 29, gender: "Female", blood_group: "AB+", phone: "9123456780", dept: "Gynecology", status: "Active", admitted_on: daysAgo(2), doctor: "Dr. Divya Rao" },
    { name: "Ravi Menon", age: 54, gender: "Male", blood_group: "O-", phone: "9988776655", dept: "Cardiology", status: "Discharged", admitted_on: daysAgo(31), doctor: "Dr. Priya Nair" },
    { name: "Kavitha Reddy", age: 47, gender: "Female", blood_group: "B-", phone: "9871234567", dept: "Oncology", status: "Admitted", admitted_on: daysAgo(10), doctor: "Dr. Sanjay Mehta" },
    { name: "Deepak Gupta", age: 33, gender: "Male", blood_group: "A+", phone: "9001234567", dept: "Dermatology", status: "Active", admitted_on: daysAgo(1), doctor: "Dr. Kiran Das" },
    { name: "Pooja Nair", age: 25, gender: "Female", blood_group: "O+", phone: "9543217890", dept: "Pediatrics", status: "Discharged", admitted_on: daysAgo(34), doctor: "Dr. Arjun Bose" },
    { name: "Vikram Singh", age: 67, gender: "Male", blood_group: "B+", phone: "9765432109", dept: "Urology", status: "Critical", admitted_on: daysAgo(7), doctor: "Dr. Nitin Jain" },
    { name: "Ananya Das", age: 38, gender: "Female", blood_group: "A-", phone: "9234567891", dept: "ENT", status: "Active", admitted_on: daysAgo(0), doctor: "Dr. Leena Pillai" },
    { name: "Rahul Verma", age: 52, gender: "Male", blood_group: "AB-", phone: "9887654321", dept: "Gastroenterology", status: "Admitted", admitted_on: daysAgo(3), doctor: "Dr. Pooja Sharma" },
    { name: "Sunita Joshi", age: 44, gender: "Female", blood_group: "O+", phone: "9345678902", dept: "Cardiology", status: "Active", admitted_on: daysAgo(17), doctor: "Dr. Priya Nair" },
  ];
  const insertPatient = db.prepare(
    `INSERT INTO patients (id, name, age, gender, blood_group, phone, dept, doctor_id, status, admitted_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const patientIdByName = {};
  for (const p of patients) {
    const id = nextId("P", "patients");
    insertPatient.run(id, p.name, p.age, p.gender, p.blood_group, p.phone, p.dept, doctorIdByName[p.doctor] || null, p.status, p.admitted_on);
    patientIdByName[p.name] = id;
  }

  console.log("Seeding appointments…");
  const appts = [
    { patient: "Arjun Sharma", doctor: "Dr. Priya Nair", dept: "Cardiology", date: daysFromNow(0), time: "09:00", type: "Follow-up", status: "Confirmed" },
    { patient: "Meena Patel", doctor: "Dr. Rahul Sen", dept: "Orthopedics", date: daysFromNow(0), time: "09:30", type: "Consultation", status: "Confirmed" },
    { patient: "Suresh Kumar", doctor: "Dr. Anita Roy", dept: "Neurology", date: daysFromNow(0), time: "10:00", type: "Emergency", status: "Confirmed", notes: "Priority" },
    { patient: "Lakshmi Iyer", doctor: "Dr. Divya Rao", dept: "Gynecology", date: daysFromNow(0), time: "10:30", type: "Routine", status: "Pending" },
    { patient: "Ravi Menon", doctor: "Dr. Priya Nair", dept: "Cardiology", date: daysFromNow(0), time: "11:00", type: "Consultation", status: "Cancelled" },
    { patient: "Kavitha Reddy", doctor: "Dr. Sanjay Mehta", dept: "Oncology", date: daysFromNow(0), time: "11:30", type: "Follow-up", status: "Confirmed" },
    { patient: "Deepak Gupta", doctor: "Dr. Kiran Das", dept: "Dermatology", date: daysFromNow(0), time: "14:00", type: "Consultation", status: "Confirmed" },
    { patient: "Pooja Nair", doctor: "Dr. Anita Roy", dept: "Neurology", date: daysFromNow(1), time: "09:00", type: "Routine", status: "Pending" },
    { patient: "Vikram Singh", doctor: "Dr. Nitin Jain", dept: "Urology", date: daysFromNow(1), time: "10:30", type: "Follow-up", status: "Confirmed" },
    { patient: "Ananya Das", doctor: "Dr. Leena Pillai", dept: "ENT", date: daysFromNow(1), time: "11:00", type: "Consultation", status: "Pending" },
    { patient: "Rahul Verma", doctor: "Dr. Pooja Sharma", dept: "Gastroenterology", date: daysAgo(2), time: "10:00", type: "Consultation", status: "Completed" },
    { patient: "Sunita Joshi", doctor: "Dr. Priya Nair", dept: "Cardiology", date: daysAgo(5), time: "09:15", type: "Follow-up", status: "Completed" },
  ];
  const insertAppt = db.prepare(
    `INSERT INTO appointments (id, patient_id, doctor_id, dept, appt_date, appt_time, type, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const a of appts) {
    const id = nextId("A", "appointments");
    insertAppt.run(id, patientIdByName[a.patient], doctorIdByName[a.doctor], a.dept, a.date, a.time, a.type, a.status, a.notes || null);
  }

  console.log("Seeding bills…");
  const bills = [
    { patient: "Arjun Sharma", date: daysAgo(18), paid: true, payMode: "UPI", items: [["Consultation", 800], ["ECG", 400], ["Medicines", 620]] },
    { patient: "Meena Patel", date: daysAgo(10), paid: false, payMode: null, items: [["Consultation", 700], ["X-Ray", 500], ["Physio Session", 800]] },
    { patient: "Suresh Kumar", date: daysAgo(3), paid: false, payMode: null, items: [["Consultation", 900], ["MRI", 3500], ["ICU Charges", 5000]] },
    { patient: "Lakshmi Iyer", date: daysAgo(2), paid: true, payMode: "Card", items: [["Consultation", 750], ["Ultrasound", 600]] },
    { patient: "Ravi Menon", date: daysAgo(29), paid: true, payMode: "Cash", items: [["Consultation", 800], ["Angiography", 8000], ["Medicines", 1200]] },
    { patient: "Kavitha Reddy", date: daysAgo(1), paid: false, payMode: null, items: [["Consultation", 1100], ["Chemo Session", 12000], ["Lab Tests", 2400]] },
  ];
  const insertBill = db.prepare(`INSERT INTO bills (id, patient_id, bill_date, paid, pay_mode) VALUES (?, ?, ?, ?, ?)`);
  const insertBillItem = db.prepare(`INSERT INTO bill_items (bill_id, name, fee) VALUES (?, ?, ?)`);
  for (const b of bills) {
    const id = nextId("B", "bills");
    insertBill.run(id, patientIdByName[b.patient], b.date, b.paid ? 1 : 0, b.payMode);
    for (const [name, fee] of b.items) insertBillItem.run(id, name, fee);
  }

  console.log("Seeding pharmacy inventory…");
  const meds = [
    { name: "Amoxicillin 500mg", category: "Antibiotic", stock: 45, min_stock: 50, price: 12, unit: "Strip" },
    { name: "Paracetamol 650mg", category: "Analgesic", stock: 280, min_stock: 100, price: 5, unit: "Strip" },
    { name: "Metformin 500mg", category: "Antidiabetic", stock: 130, min_stock: 80, price: 8, unit: "Strip" },
    { name: "Atorvastatin 20mg", category: "Statin", stock: 95, min_stock: 60, price: 18, unit: "Strip" },
    { name: "Omeprazole 20mg", category: "PPI", stock: 210, min_stock: 100, price: 10, unit: "Strip" },
    { name: "Azithromycin 250mg", category: "Antibiotic", stock: 70, min_stock: 50, price: 22, unit: "Strip" },
    { name: "Amlodipine 5mg", category: "Antihypertensive", stock: 160, min_stock: 80, price: 6, unit: "Strip" },
    { name: "Losartan 50mg", category: "Antihypertensive", stock: 115, min_stock: 80, price: 14, unit: "Strip" },
    { name: "Dolo 650", category: "Analgesic", stock: 400, min_stock: 150, price: 4, unit: "Strip" },
    { name: "Cetirizine 10mg", category: "Antihistamine", stock: 190, min_stock: 100, price: 3, unit: "Strip" },
    { name: "Insulin Glargine", category: "Antidiabetic", stock: 22, min_stock: 30, price: 420, unit: "Vial" },
    { name: "IV Saline 500ml", category: "IV Fluid", stock: 60, min_stock: 40, price: 38, unit: "Bottle" },
  ];
  const insertMed = db.prepare(`INSERT INTO medicines (id, name, category, stock, min_stock, price, unit) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const m of meds) {
    insertMed.run(nextId("M", "medicines"), m.name, m.category, m.stock, m.min_stock, m.price, m.unit);
  }

  console.log("Seeding wards…");
  const wards = [
    { name: "General Ward A", type: "General", capacity: 20, occupied: 14, floor: 1 },
    { name: "General Ward B", type: "General", capacity: 20, occupied: 18, floor: 1 },
    { name: "ICU", type: "ICU", capacity: 10, occupied: 8, floor: 2 },
    { name: "Cardiac ICU", type: "ICU", capacity: 8, occupied: 5, floor: 2 },
    { name: "Maternity Ward", type: "Maternity", capacity: 15, occupied: 9, floor: 3 },
    { name: "Pediatric Ward", type: "Pediatric", capacity: 12, occupied: 7, floor: 3 },
    { name: "Oncology Ward", type: "Specialty", capacity: 10, occupied: 6, floor: 4 },
    { name: "Private Rooms", type: "Private", capacity: 20, occupied: 11, floor: 4 },
  ];
  const insertWard = db.prepare(`INSERT INTO wards (id, name, type, capacity, occupied, floor) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const w of wards) insertWard.run(nextId("W", "wards"), w.name, w.type, w.capacity, w.occupied, w.floor);

  console.log("\nSeed complete. Demo staff logins:");
  for (const u of DEMO_USERS) console.log(`  ${u.role.padEnd(13)} ${u.email} / ${u.password}`);
}

run();

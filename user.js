import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAADUqPrDtltsOiTXJ5AcQ07tkWAJdBa54",
    authDomain: "chanchai-office.firebaseapp.com",
    projectId: "chanchai-office",
    storageBucket: "chanchai-office.firebasestorage.app",
    messagingSenderId: "933936461367",
    appId: "1:933936461367:web:4500e6c940133dc5b2b1b2",
    measurementId: "G-9M8LCDB6KV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentUserId = localStorage.getItem('session_user_id');
let currentRate = 0; 

document.addEventListener("DOMContentLoaded", () => {
    if (!currentUserId) { window.location.href = 'login.html'; return; }
    updateHeaderDisplay(); 
    loadUserProfile();
    populateFuelDropdown();
    
    const now = new Date();
    const monthInput = document.getElementById('user-report-month');
    if (monthInput) {
        monthInput.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        monthInput.addEventListener('change', window.renderUserReports);
    }
    window.switchTab('edit'); 
});

async function updateHeaderDisplay() {
    const docSnap = await getDoc(doc(db, "users", currentUserId));
    if(docSnap.exists()) {
        const u = docSnap.data();
        document.getElementById('header-user-name').innerText = `${u.frstname} ${u.lastname}`;
        document.getElementById('header-avatar').src = u.Image_file || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
    }
}

window.switchTab = function(targetTab) {
    document.querySelectorAll('.tab-view').forEach(view => view.style.display = 'none');
    document.querySelectorAll('.sidebar .menu-item').forEach(item => item.classList.remove('active'));
    document.getElementById(`tab-${targetTab}-view`).style.display = 'block';
    if(document.getElementById(`menu-${targetTab}`)) document.getElementById(`menu-${targetTab}`).classList.add('active');
    
    if (targetTab === 'report') window.renderUserReports();
}

async function loadUserProfile() {
    const docSnap = await getDoc(doc(db, "users", currentUserId));
    if(docSnap.exists()) {
        const u = docSnap.data();
        document.getElementById('edit-frstname').value = u.frstname || "";
        document.getElementById('edit-lastname').value = u.lastname || "";
        document.getElementById('edit-password').value = u.password || "";
        document.getElementById('edit-phone').value = u.Phone_number || "";
        document.getElementById('edit-position').value = u.job_position || "-";
        document.getElementById('edit-dept').value = u.Department || "-";
        document.getElementById('edit-location').value = u.work_location || "-";
        document.getElementById('profile-avatar-display').src = u.Image_file || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
    }
}

window.updateProfileData = async function() {
    const executeUpdate = async (base64Img) => {
        let updateData = {
            frstname: document.getElementById('edit-frstname').value.trim(),
            lastname: document.getElementById('edit-lastname').value.trim(),
            password: document.getElementById('edit-password').value,
            Phone_number: document.getElementById('edit-phone').value.trim()
        };
        if(base64Img) updateData.Image_file = base64Img;
        
        await updateDoc(doc(db, "users", currentUserId), updateData);
        if(base64Img) document.getElementById('profile-avatar-display').src = base64Img;
        document.getElementById('edit-avatar').value = ''; 
        updateHeaderDisplay(); 
        Swal.fire({ icon: 'success', title: 'อัปเดตสำเร็จ', text: 'ข้อมูลส่วนตัวของคุณถูกบันทึกแล้ว', confirmButtonText: 'ตกลง' });
    };
    const fileInput = document.getElementById('edit-avatar');
    if (fileInput.files.length > 0) { const r = new FileReader(); r.onload = e => executeUpdate(e.target.result); r.readAsDataURL(fileInput.files[0]); } else { executeUpdate(null); }
}

async function populateFuelDropdown() {
    const dropdown = document.getElementById('w-fuel-type');
    if(!dropdown) return;
    dropdown.innerHTML = '<option value="">-- เลือกเรทคำนวณ --</option>';
    const querySnapshot = await getDocs(collection(db, "fuels"));
    querySnapshot.forEach(docSnap => {
        const f = docSnap.data();
        dropdown.innerHTML += `<option value="${f.name}" data-rate="${f.rate}">${f.name} (฿${f.rate}/กม.)</option>`;
    });
}

window.calculateLiveExpense = function() {
    const start = parseFloat(document.getElementById('w-start-mile').value) || 0, end = parseFloat(document.getElementById('w-end-mile').value) || 0;
    const dropdown = document.getElementById('w-fuel-type');
    currentRate = dropdown.selectedIndex > 0 ? parseFloat(dropdown.options[dropdown.selectedIndex].getAttribute('data-rate')) : 0;
    let distance = Math.max(0, end - start);
    document.getElementById('live-distance').innerText = distance; document.getElementById('live-expense').innerText = (distance * currentRate).toFixed(2);
}

window.saveWorkReport = async function() {
    const editId = document.getElementById('edit-report-id').value;
    const wDate = document.getElementById('w-date').value;
    const wTime = document.getElementById('w-time').value;
    const fuelType = document.getElementById('w-fuel-type').value;
    const start = parseFloat(document.getElementById('w-start-mile').value);
    const end = parseFloat(document.getElementById('w-end-mile').value);
    const detail = document.getElementById('w-detail').value.trim();
    const fileInput = document.getElementById('w-file');
    
    if(!wDate || !fuelType || isNaN(start) || isNaN(end) || !detail) return Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูลให้ครบถ้วน', confirmButtonText: 'ตกลง' });
    if (end <= start) return Swal.fire({ icon: 'error', title: 'เลขไมล์สิ้นสุดต้องมากกว่าเลขไมล์เริ่มต้น', confirmButtonText: 'ตกลง' });

    const distance = end - start;
    const expense = distance * currentRate;
    
    const executeSaving = async (base64Img) => {
        let reportData = {
            user_id: currentUserId, 
            work_date: wDate, 
            work_time: wTime || '00:00',
            distance_km: distance, 
            work_detail: detail, 
            Reimbursable_expense: expense.toFixed(2), 
            Approve_disbursement: "P"
        };
        if(base64Img) reportData.Image_file = base64Img;

        if (editId) {
            await updateDoc(doc(db, "fuel", editId), reportData);
        } else {
            const newId = "REP" + Date.now();
            await setDoc(doc(db, "fuel", newId), reportData);
        }
        
        Swal.fire({ icon: 'success', title: 'ส่งคำขอเบิกสำเร็จ!', confirmButtonText: 'ตกลง' }).then(() => {
            document.getElementById('edit-report-id').value = ''; 
            document.getElementById('w-start-mile').value = ''; 
            document.getElementById('w-end-mile').value = ''; 
            document.getElementById('w-detail').value = '';
            document.getElementById('w-file').value = '';
            window.calculateLiveExpense(); window.switchTab('report');
        });
    };
    
    if (fileInput.files.length > 0) { const r = new FileReader(); r.onload = e => executeSaving(e.target.result); r.readAsDataURL(fileInput.files[0]); } else { executeSaving(""); }
}

window.renderUserReports = async function() {
    const tbody = document.getElementById('user-report-list'); tbody.innerHTML = '<tr><td colspan="8">กำลังโหลดรายการ...</td></tr>';
    const querySnapshot = await getDocs(collection(db, "fuel"));
    let myReports = [];
    querySnapshot.forEach(docSnap => { if(docSnap.data().user_id === currentUserId) myReports.push({ id: docSnap.id, ...docSnap.data() }); });
    myReports.sort((a,b) => b.id.localeCompare(a.id));
    
    const selectedMonth = document.getElementById('user-report-month').value;
    let displayReports = selectedMonth ? myReports.filter(r => r.work_date.startsWith(selectedMonth)) : myReports;
    
    tbody.innerHTML = '';
    let filteredCount = 0, filteredKm = 0, filteredBaht = 0;
    
    displayReports.forEach((r, idx) => {
        if(r.Approve_disbursement !== 'N') { 
            filteredKm += parseFloat(r.distance_km) || 0; 
            filteredBaht += parseFloat(r.Reimbursable_expense) || 0; 
            filteredCount++; 
        }
        let statusText = r.Approve_disbursement === 'P' ? 'รอตรวจสอบ' : (r.Approve_disbursement === 'Y' ? 'อนุมัติ' : 'ไม่อนุมัติ');
        let actionBtns = r.Approve_disbursement === 'P' ? `<button class="btn-pill btn-edit py-1 px-2 me-1" style="font-size:12px;" onclick="window.editReport('${r.id}')">✏️</button><button class="btn-pill btn-red py-1 px-2" style="font-size:12px;" onclick="window.deleteReport('${r.id}')">🗑️</button>` : '<span class="no-print">-</span>';
        
        if(r.Approve_disbursement === 'N' && r.reason) { statusText += `<br><small class="text-danger fw-bold">สาเหตุ: ${r.reason}</small>`; }
        
        tbody.innerHTML += `<tr><td>${idx + 1}</td><td>${r.work_date}</td><td>${r.work_time || '-'}</td><td>${r.work_detail}</td><td>${r.distance_km} กม.</td><td class="text-success">฿${r.Reimbursable_expense}</td><td><span class="status-tag status-${r.Approve_disbursement}">${statusText}</span></td><td class="no-print">${actionBtns}</td></tr>`;
    });
    
    document.getElementById('user-bill-count').innerText = `${filteredCount} รายการ`; 
    document.getElementById('user-bill-km').innerText = `${filteredKm.toFixed(2)} กม.`; 
    document.getElementById('user-bill-total').innerText = `฿${filteredBaht.toFixed(2)}`;

    let allTimeBaht = 0;
    let allTimeKm = 0;
    myReports.forEach(r => {
        if(r.Approve_disbursement === 'Y' || r.Approve_disbursement === 'P') { 
            allTimeBaht += parseFloat(r.Reimbursable_expense) || 0; 
            allTimeKm += parseFloat(r.distance_km) || 0; 
        }
    });
    if(document.getElementById('sum-total')) document.getElementById('sum-total').innerText = allTimeBaht.toFixed(2);
    if(document.getElementById('sum-km')) document.getElementById('sum-km').innerText = allTimeKm.toFixed(2);
    if(document.getElementById('sum-month-km')) document.getElementById('sum-month-km').innerText = filteredKm.toFixed(2);
}

window.deleteReport = function(id) {
    Swal.fire({ title: 'ต้องการลบคำขอนี้ใช่หรือไม่?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ตกลง (ลบทิ้ง)', cancelButtonText: 'ยกเลิก' }).then(async (result) => {
        if (result.isConfirmed) { await deleteDoc(doc(db, "fuel", id)); window.renderUserReports(); Swal.fire({title: 'ลบสำเร็จ', text: '', icon: 'success', confirmButtonText: 'ตกลง'}); }
    });
}

window.editReport = async function(id) {
    const docSnap = await getDoc(doc(db, "fuel", id));
    if(docSnap.exists()) {
        const r = docSnap.data();
        document.getElementById('edit-report-id').value = id; 
        document.getElementById('w-date').value = r.work_date; 
        document.getElementById('w-time').value = r.work_time || ''; 
        document.getElementById('w-detail').value = r.work_detail;
        window.switchTab('work'); 
        window.calculateLiveExpense(); 
        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'ดึงข้อมูลเก่ามาแก้ไขแล้ว', showConfirmButton: false, timer: 2000 });
    }
}

window.printReport = function() { window.print(); }
window.exitSystem = function() { 
    Swal.fire({ title: 'ออกจากระบบ', icon: 'question', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ตกลง (ออกจากระบบ)', cancelButtonText: 'ยกเลิก' }).then((result) => { 
        if(result.isConfirmed) { localStorage.removeItem('session_user_id'); window.location.href = 'login.html'; } 
    }); 
}
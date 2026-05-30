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

let adminSessionId = localStorage.getItem('session_user_id');

document.addEventListener("DOMContentLoaded", () => {
    if (!adminSessionId) { window.location.href = 'login.html'; return; }
    updateHeaderDisplay();
    window.switchAdminTab('profile'); 
    
    document.getElementById('report-filter-user').addEventListener('change', window.renderAllReports);
    document.getElementById('report-filter-month').addEventListener('change', window.renderAllReports);
});

async function updateHeaderDisplay() {
    const docSnap = await getDoc(doc(db, "users", adminSessionId));
    if(docSnap.exists()) {
        const u = docSnap.data();
        document.getElementById('header-user-name').innerText = `${u.frstname} ${u.lastname}`;
        document.getElementById('header-avatar').src = u.Image_file || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
    }
}

window.switchAdminTab = function(tabName) {
    document.querySelectorAll('.adm-tab-view').forEach(view => view.style.display = 'none');
    document.querySelectorAll('.sidebar .menu-item').forEach(item => item.classList.remove('active'));
    document.getElementById(`adm-${tabName}-view`).style.display = 'block';
    if(document.getElementById(`menu-${tabName}`)) document.getElementById(`menu-${tabName}`).classList.add('active');
    
    if(tabName === 'profile') loadAdminProfile();
    if(tabName === 'users') renderEmployeeList();
    if(tabName === 'prices') loadFuelSettings();
    if(tabName === 'approves') renderApprovalQueue();
    if(tabName === 'reports') { populateReportUserDropdown().then(window.renderAllReports); }
}

async function loadAdminProfile() {
    const docSnap = await getDoc(doc(db, "users", adminSessionId));
    if(docSnap.exists()) {
        const u = docSnap.data();
        document.getElementById('adm-frstname').value = u.frstname || "";
        document.getElementById('adm-lastname').value = u.lastname || "";
        document.getElementById('adm-userid').value = u.user_id || "";
        document.getElementById('adm-password').value = u.password || "";
        document.getElementById('adm-phone').value = u.Phone_number || "";
        document.getElementById('adm-position').value = u.job_position || "admin";
        document.getElementById('adm-avatar-display').src = u.Image_file || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
    }
}

window.updateAdminProfile = async function() {
    const executeUpdate = async (base64Img) => {
        let updateData = {
            frstname: document.getElementById('adm-frstname').value.trim(),
            lastname: document.getElementById('adm-lastname').value.trim(),
            password: document.getElementById('adm-password').value,
            Phone_number: document.getElementById('adm-phone').value.trim()
        };
        if(base64Img) updateData.Image_file = base64Img;
        
        await updateDoc(doc(db, "users", adminSessionId), updateData);
        if(base64Img) document.getElementById('adm-avatar-display').src = base64Img;
        document.getElementById('adm-avatar').value = ''; 
        updateHeaderDisplay();
        Swal.fire({ icon: 'success', title: 'อัปเดตสำเร็จ', text: 'บันทึกข้อมูลเรียบร้อย', confirmButtonText: 'ตกลง' });
    };

    const fileInput = document.getElementById('adm-avatar');
    if (fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = function(e) { executeUpdate(e.target.result); };
        reader.readAsDataURL(fileInput.files[0]);
    } else { executeUpdate(null); }
}

async function renderEmployeeList() {
    const tbody = document.getElementById('admin-user-tbody');
    tbody.innerHTML = '<tr><td colspan="7" class="py-3">กำลังโหลดข้อมูล...</td></tr>';
    
    const querySnapshot = await getDocs(collection(db, "users"));
    tbody.innerHTML = '';
    querySnapshot.forEach((docSnap) => {
        const u = docSnap.data();
        let actionBtns = u.user_id === adminSessionId ? '<span class="text-muted">(คุณ)</span>' : `<button class="btn-pill btn-edit py-1 px-2 me-1" style="font-size:11px;" onclick="window.editUser('${u.user_id}')">✏️</button> <button class="btn-pill btn-red py-1 px-2" style="font-size:11px;" onclick="window.deleteUser('${u.user_id}')">🗑️</button>`;
        let roleBadge = u.role === 'admin' ? '<span class="badge bg-primary">Admin</span>' : '<span class="badge bg-secondary">User</span>';
        let avatarImg = u.Image_file || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
        tbody.innerHTML += `<tr>
            <td class="text-center"><img src="${avatarImg}" class="avatar-sm"></td>
            <td class="text-center"><strong>${u.user_id}</strong><br>${roleBadge}</td>
            <td>${u.frstname} ${u.lastname}</td>
            <td>${u.job_position}<br><small class="text-muted">${u.Department}</small></td>
            <td>${u.work_location}<br><small class="text-muted">${u.start_date}</small></td>
            <td class="text-center">${u.Phone_number}</td>
            <td class="text-center">${actionBtns}</td>
        </tr>`;
    });
}

window.addNewUser = function() {
    Swal.fire({
        title: 'เพิ่มพนักงานใหม่',
        html: `<input id="swal-uid" class="swal2-input" placeholder="รหัสพนักงาน" style="width: 80%;">
               <input id="swal-pass" class="swal2-input" placeholder="รหัสผ่าน" style="width: 80%;">
               <input id="swal-fname" class="swal2-input" placeholder="ชื่อจริง" style="width: 80%;">
               <input id="swal-lname" class="swal2-input" placeholder="นามสกุล" style="width: 80%;">
               <input id="swal-position" class="swal2-input" placeholder="ตำแหน่งงาน" style="width: 80%;">
               <input id="swal-loc" class="swal2-input" placeholder="สถานที่ปฏิบัติงาน" style="width: 80%;">
               <input id="swal-dept" class="swal2-input" placeholder="แผนก" style="width: 80%;">
               <input id="swal-sdate" class="swal2-input" type="date" placeholder="วันที่เริ่มงาน" style="width: 80%;">
               <input id="swal-phone" class="swal2-input" placeholder="เบอร์โทรศัพท์" style="width: 80%;">
               <select id="swal-role" class="swal2-input" style="width: 80%;"><option value="user">User</option><option value="admin">Admin</option></select>`,
        showCancelButton: true, confirmButtonText: 'ตกลง (บันทึก)', cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            const uid = document.getElementById('swal-uid').value.trim();
            if(!uid) { Swal.showValidationMessage('กรุณากรอกรหัสพนักงาน'); return false; }
            return {
                user_id: uid, password: document.getElementById('swal-pass').value, frstname: document.getElementById('swal-fname').value, lastname: document.getElementById('swal-lname').value,
                job_position: document.getElementById('swal-position').value || '-', work_location: document.getElementById('swal-loc').value || '-', Department: document.getElementById('swal-dept').value || '-', start_date: document.getElementById('swal-sdate').value || '', Phone_number: document.getElementById('swal-phone').value || '-', role: document.getElementById('swal-role').value
            }
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            let data = result.value;
            const existing = await getDoc(doc(db, "users", data.user_id));
            if(existing.exists()){ return Swal.fire('ข้อผิดพลาด', 'รหัสพนักงานนี้มีอยู่แล้ว!', 'error'); }
            data.Image_file = "";
            await setDoc(doc(db, "users", data.user_id), data);
            renderEmployeeList();
            Swal.fire({title: 'สำเร็จ', text: 'เพิ่มพนักงานใหม่เรียบร้อย', icon: 'success', confirmButtonText: 'ตกลง'});
        }
    });
}

window.deleteUser = function(uid) {
    Swal.fire({ title: 'ต้องการลบพนักงานคนนี้ใช่หรือไม่?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ตกลง (ลบทิ้ง)', cancelButtonText: 'ยกเลิก' }).then(async (result) => {
        if (result.isConfirmed) { await deleteDoc(doc(db, "users", uid)); renderEmployeeList(); Swal.fire({title: 'ลบสำเร็จ', text: '', icon: 'success', confirmButtonText: 'ตกลง'}); }
    });
}

window.editUser = async function(uid) {
    const docSnap = await getDoc(doc(db, "users", uid));
    if(!docSnap.exists()) return;
    let u = docSnap.data();

    Swal.fire({
        title: `แก้ไขข้อมูล: ${uid}`,
        html: `<div style="text-align: left; font-size: 14px; margin-bottom: 5px; padding-left: 10%;">รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)</div>
               <input id="swal-edit-pass" class="swal2-input" placeholder="รหัสผ่านใหม่" type="text" style="width: 80%;">
               <div style="text-align: left; font-size: 14px; margin-top: 15px; margin-bottom: 5px; padding-left: 10%;">ข้อมูลส่วนตัวพนักงาน</div>
               <input id="swal-edit-fname" class="swal2-input" value="${u.frstname}" placeholder="ชื่อจริง" style="width: 80%;">
               <input id="swal-edit-lname" class="swal2-input" value="${u.lastname}" placeholder="นามสกุล" style="width: 80%;">
               <input id="swal-edit-position" class="swal2-input" value="${u.job_position || ''}" placeholder="ตำแหน่ง" style="width: 80%;">
               <input id="swal-edit-phone" class="swal2-input" value="${u.Phone_number || ''}" placeholder="เบอร์โทรศัพท์" style="width: 80%;">
               <input id="swal-edit-dept" class="swal2-input" value="${u.Department || ''}" placeholder="แผนก" style="width: 80%;">
               <select id="swal-edit-role" class="swal2-input" style="width: 80%;"><option value="user" ${u.role==='user'?'selected':''}>User</option><option value="admin" ${u.role==='admin'?'selected':''}>Admin</option></select>`,
        showCancelButton: true, confirmButtonText: 'ตกลง (บันทึก)', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#f59e0b'
    }).then(async (result) => {
        if (result.isConfirmed) {
            let updateData = {
                frstname: document.getElementById('swal-edit-fname').value, 
                lastname: document.getElementById('swal-edit-lname').value, 
                job_position: document.getElementById('swal-edit-position').value,
                Department: document.getElementById('swal-edit-dept').value,
                Phone_number: document.getElementById('swal-edit-phone').value,
                role: document.getElementById('swal-edit-role').value
            };
            
            let newPass = document.getElementById('swal-edit-pass').value.trim();
            if(newPass !== '') { updateData.password = newPass; }

            await updateDoc(doc(db, "users", uid), updateData);
            renderEmployeeList(); Swal.fire({title: 'บันทึกสำเร็จ', text: 'อัปเดตข้อมูลพนักงานเรียบร้อย', icon: 'success', confirmButtonText: 'ตกลง'});
        }
    });
}

async function populateReportUserDropdown() {
    const select = document.getElementById('report-filter-user');
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- แสดงพนักงานทุกคน --</option>';
    
    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach(docSnap => {
        const u = docSnap.data();
        if (u.role !== 'admin') select.innerHTML += `<option value="${u.user_id}">${u.frstname} ${u.lastname} (${u.user_id})</option>`;
    });
    select.value = currentValue;
}

window.renderAllReports = async function() {
    const tbody = document.getElementById('admin-reports-tbody');
    const filterUser = document.getElementById('report-filter-user').value;
    const filterMonth = document.getElementById('report-filter-month').value;
    
    const querySnapshot = await getDocs(collection(db, "fuel"));
    let reports = [];
    querySnapshot.forEach(docSnap => reports.push({ id: docSnap.id, ...docSnap.data() }));
    
    let filtered = reports.filter(r => {
        return (!filterUser || r.user_id === filterUser) && (!filterMonth || r.work_date.startsWith(filterMonth));
    });

    tbody.innerHTML = '';
    if (filtered.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">ไม่พบข้อมูลรายงานในเงื่อนไขนี้</td></tr>'; 
        document.getElementById('rep-sum-count').innerText = `0 รายการ`;
        document.getElementById('rep-sum-km').innerText = `0 กม.`;
        document.getElementById('rep-sum-total').innerText = `฿0.00`;
        return; 
    }
    
    let totalKm = 0, totalBaht = 0;
    filtered.forEach(r => {
        let statusText = r.Approve_disbursement === 'P' ? 'รออนุมัติ' : (r.Approve_disbursement === 'Y' ? 'อนุมัติ' : 'ไม่อนุมัติ');
        if(r.Approve_disbursement === 'N' && r.reason) { statusText += `<br><small class="text-danger fw-bold">สาเหตุ: ${r.reason}</small>`; }
        if(r.Approve_disbursement !== 'N') {
            totalKm += parseFloat(r.distance_km) || 0; 
            totalBaht += parseFloat(r.Reimbursable_expense) || 0;
        }
        tbody.innerHTML += `<tr><td>${r.work_date}</td><td>${r.work_time || '-'}</td><td><strong>${r.user_id}</strong></td><td>${r.work_detail}</td><td>${r.distance_km}</td><td class="text-success">฿${r.Reimbursable_expense}</td><td><span class="status-tag status-${r.Approve_disbursement}">${statusText}</span></td></tr>`;
    });
    document.getElementById('rep-sum-count').innerText = `${filtered.length} รายการ`;
    document.getElementById('rep-sum-km').innerText = `${totalKm.toFixed(2)} กม.`;
    document.getElementById('rep-sum-total').innerText = `฿${totalBaht.toFixed(2)}`;
}

window.viewImageFullscreen = function(url) {
    Swal.fire({
        imageUrl: url,
        imageAlt: 'หลักฐานแนบ',
        width: 'auto',
        padding: 0,
        showConfirmButton: false,
        showCloseButton: true,
        background: 'transparent',
        backdrop: 'rgba(0,0,0,0.85)',
        customClass: { image: 'rounded border border-2 border-white' }
    });
}

async function renderApprovalQueue() {
    const container = document.getElementById('admin-verification-queue'); 
    container.innerHTML = '<div class="text-center p-3">กำลังโหลดรายการขออนุมัติ...</div>';
    
    const reportsSnap = await getDocs(collection(db, "fuel"));
    const usersSnap = await getDocs(collection(db, "users"));
    
    let usersMap = {};
    usersSnap.forEach(u => usersMap[u.data().user_id] = u.data());
    
    let reports = [];
    reportsSnap.forEach(r => reports.push({ id: r.id, ...r.data() }));
    let pendingReports = reports.filter(r => r.Approve_disbursement === 'P');

    container.innerHTML = '';
    if (pendingReports.length === 0) { container.innerHTML = '<div class="text-center p-4 text-muted">🎉 ยอดเยี่ยม! ไม่มีรายการตกค้างรออนุมัติ</div>'; return; }
    
    pendingReports.forEach(r => {
        let u = usersMap[r.user_id] || {};
        let actionButtons = `<div class="mt-3"><button class="btn-pill btn-green me-2 py-1 px-3" onclick="window.processApproval('${r.id}', 'Y')">✔️ อนุมัติ</button><button class="btn-pill btn-red py-1 px-3" onclick="window.processApproval('${r.id}', 'N')">❌ ไม่อนุมัติ</button></div>`;
        
        let proofImgHtml = '<span class="text-muted">ไม่มีรูปแนบ</span>';
        if (r.Image_file) {
            proofImgHtml = `<img src="${r.Image_file}" class="receipt-image-thumbnail" title="คลิกเพื่อดูรูปใหญ่" onclick="window.viewImageFullscreen('${r.Image_file}')">`;
        }

        let requestorAvatar = u.Image_file || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150";
        
        container.innerHTML += `<div class="white-card d-flex justify-content-between align-items-center mb-3 p-3 border rounded shadow-sm">
            <div class="d-flex align-items-center gap-3">
                <img src="${requestorAvatar}" class="avatar-sm" alt="รูปโปรไฟล์ผู้ขอเบิก">
                <div>
                    <div class="fw-bold fs-5 text-dark">ผู้ขอเบิก: ${u.frstname || 'ไม่ทราบชื่อ'} (${r.user_id})</div>
                    <div class="text-secondary mt-1">วันที่ทำงาน: <strong>${r.work_date} (${r.work_time || ''})</strong></div>
                    <div class="text-secondary">รายละเอียด: ${r.work_detail}</div>
                    <div class="mt-2 text-primary fw-bold">ระยะทาง: ${r.distance_km} กม. | ยอดเงินเบิก: ฿${r.Reimbursable_expense}</div>
                    ${actionButtons}
                </div>
            </div>
            <div class="receipt-image-container">${proofImgHtml}</div>
        </div>`;
    });
}

window.processApproval = function(reportId, newStatus) {
    if(newStatus === 'N') {
        Swal.fire({ 
            title: 'ปฏิเสธการเบิกจ่าย', 
            text: 'ระบุเหตุผลที่ไม่อนุมัติ:', 
            input: 'text', 
            icon: 'warning', 
            showCancelButton: true, 
            confirmButtonColor: '#ef4444', 
            confirmButtonText: 'ตกลง (ปฏิเสธ)',
            cancelButtonText: 'ยกเลิก',
            inputValidator: (value) => { if (!value) return 'กรุณาระบุเหตุผลที่ไม่อนุมัติด้วยครับ'; }
        }).then(async (result) => {
            if (result.isConfirmed) { 
                await updateDoc(doc(db, "fuel", reportId), { Approve_disbursement: 'N', reason: result.value });
                renderApprovalQueue(); Swal.fire({title: 'บันทึกสำเร็จ', text: 'ปฏิเสธคำขอแล้ว', icon: 'success', confirmButtonText: 'ตกลง'}); 
            }
        });
    } else {
        Swal.fire({ 
            title: 'ยืนยันการอนุมัติยอดเงินนี้?', 
            icon: 'question', 
            showCancelButton: true, 
            confirmButtonColor: '#10b981', 
            confirmButtonText: 'ตกลง (อนุมัติจ่ายเงิน)',
            cancelButtonText: 'ยกเลิก'
        }).then(async (result) => {
            if(result.isConfirmed) { 
                await updateDoc(doc(db, "fuel", reportId), { Approve_disbursement: 'Y' });
                renderApprovalQueue(); Swal.fire({title: 'อนุมัติเรียบร้อย', text: '', icon: 'success', confirmButtonText: 'ตกลง'}); 
            }
        });
    }
}

async function loadFuelSettings() {
    const tbody = document.getElementById('admin-fuel-tbody'); 
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3">กำลังโหลดข้อมูลราคาน้ำมัน...</td></tr>';
    
    const q = await getDocs(collection(db, "fuels"));
    tbody.innerHTML = '';
    
    let idx = 1; 
    q.forEach(docSnap => {
        const f = docSnap.data();
        let badgeColor = f.type === 'ไฟฟ้า' ? '#10b981' : (f.type === 'แก๊ส' ? '#f59e0b' : '#64748b');
        
        tbody.innerHTML += `<tr>
            <td>${idx++}</td>
            <td><span class="status-tag" style="background:${badgeColor}; color:white; border:none; min-width:80px;">${f.type || 'ทั่วไป'}</span></td>
            <td class="text-start ps-3"><strong>${f.name}</strong></td>
            <td><input type="number" step="0.01" class="form-control fuel-rate-input text-center mx-auto" data-id="${f.id}" value="${f.rate}" style="max-width:120px;"></td>
            <td><button class="btn-pill btn-red py-1 px-2" style="font-size:12px;" onclick="window.deleteFuel('${f.id}')">🗑️ ลบ</button></td>
        </tr>`;
    });
}

window.updateFuelPrices = async function() {
    const inputs = document.querySelectorAll('.fuel-rate-input');
    Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
    try {
        for (let input of inputs) {
            let id = input.getAttribute('data-id');
            let newRate = parseFloat(input.value) || 0;
            await updateDoc(doc(db, "fuels", id), { rate: newRate });
        }
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: 'อัปเดตเรทราคาเชื้อเพลิงทั้งหมดเรียบร้อยแล้ว', confirmButtonText: 'ตกลง' });
        loadFuelSettings();
    } catch(e) {
        Swal.fire({title: 'ข้อผิดพลาด', text: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', icon: 'error', confirmButtonText: 'ตกลง'});
    }
}

window.addNewFuel = function() {
    Swal.fire({
        title: 'เพิ่มประเภทเชื้อเพลิง/ราคากลาง',
        html: `<input id="swal-f-name" class="swal2-input" placeholder="เช่น ดีเซล B7, รถส่วนตัว">
               <input id="swal-f-rate" class="swal2-input" type="number" step="0.01" placeholder="บาท ต่อ กิโลเมตร">
               <select id="swal-f-type" class="swal2-input" style="width: 80%;"><option value="น้ำมัน">น้ำมัน</option><option value="ไฟฟ้า">ไฟฟ้า</option><option value="แก๊ส">แก๊ส</option></select>`,
        showCancelButton: true, confirmButtonText: 'ตกลง (บันทึก)', cancelButtonText: 'ยกเลิก',
        preConfirm: () => { return { name: document.getElementById('swal-f-name').value, rate: parseFloat(document.getElementById('swal-f-rate').value), type: document.getElementById('swal-f-type').value } }
    }).then(async (result) => {
        if(result.isConfirmed && result.value.name && !isNaN(result.value.rate)) {
            let id = "FUEL" + Date.now();
            await setDoc(doc(db, "fuels", id), { id: id, ...result.value });
            loadFuelSettings(); Swal.fire({title: 'สำเร็จ', text: 'บันทึกราคากลางแล้ว', icon: 'success', confirmButtonText: 'ตกลง'});
        }
    });
}

window.deleteFuel = function(id) {
    Swal.fire({ title: 'ลบประเภทเชื้อเพลิงนี้?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ตกลง (ลบ)', cancelButtonText: 'ยกเลิก' }).then(async (result) => {
        if (result.isConfirmed) { await deleteDoc(doc(db, "fuels", id)); loadFuelSettings(); Swal.fire({title: 'ลบสำเร็จ', text: '', icon: 'success', confirmButtonText: 'ตกลง'}); }
    });
}

window.printReport = function() { window.print(); }
window.exitSystem = function() { 
    Swal.fire({ title: 'ออกจากระบบ', icon: 'question', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ตกลง (ออกจากระบบ)', cancelButtonText: 'ยกเลิก' }).then((result) => { 
        if(result.isConfirmed) { localStorage.removeItem('session_user_id'); window.location.href = 'login.html'; } 
    }); 
}
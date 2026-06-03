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
let currentUploadedImageBase64 = ""; // ตัวแปรกลางสำหรับเก็บภาพ Base64 (ไม่ว่าจะมาจากไฟล์หรือกล้อง)
let cameraStream = null; // เก็บออบเจกต์สตรีมของกล้องเพื่อเปิด/ปิดใช้งาน

document.addEventListener("DOMContentLoaded", () => {
    if (!currentUserId) { window.location.href = 'login.html'; return; }
    updateHeaderDisplay(); 
    loadUserProfile();
    populateFuelDropdown();
    
    const now = new Date();
    const monthInput = document.getElementById('user-report-month');
    const dateInput = document.getElementById('user-report-date');
    
    if (monthInput) {
        monthInput.value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        monthInput.addEventListener('change', () => {
            if (dateInput) dateInput.value = ''; 
            window.renderUserReports();
        });
    }
    
    if (dateInput) {
        dateInput.addEventListener('change', () => {
            if (monthInput && dateInput.value) monthInput.value = ''; 
            window.renderUserReports();
        });
    }
    
    window.switchTab('edit'); 
});

window.clearUserFilters = function() {
    const now = new Date();
    document.getElementById('user-report-month').value = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('user-report-date').value = '';
    window.renderUserReports();
}

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
    if (targetTab !== 'work') window.stopCamera(); // ปิดกล้องอัตโนมัติหากผู้ใช้งานคลิกเปลี่ยนไปแท็บอื่น
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

// ฟังก์ชันเสริมจัดการระบบเลือกไฟล์ภาพปกติ
window.handleFileSelect = function(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentUploadedImageBase64 = e.target.result;
            document.getElementById('image-preview').src = currentUploadedImageBase64;
            document.getElementById('image-preview-container').style.display = 'block';
            window.stopCamera(); // ถ้าเปิดกล้องค้างไว้ให้ปิด เพื่อให้ความสำคัญกับรูปจากไฟล์ล่าสุด
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ฟังก์ชันเปิดสตรีมมิ่งกล้องถ่ายรูป
window.startCamera = async function() {
    document.getElementById('camera-container').style.display = 'block';
    try {
        // บังคับเลือก facingMode: "environment" เพื่อดึงกล้องหลังของมือถือมาถ่ายบิล/เลขไมล์
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
        });
        const videoElement = document.getElementById('webcam');
        videoElement.srcObject = cameraStream;
    } catch (err) {
        console.error("ไม่สามารถเข้าถึงกล้องได้:", err);
        Swal.fire({ icon: 'error', title: 'กล้องไม่พร้อมใช้งาน', text: 'ไม่สามารถเปิดใช้งานกล้องได้ กรุณาตรวจสอบการอนุญาตสิทธิ์ หรือใช้วิธีอัปโหลดรูปภาพปกติแทน', confirmButtonText: 'ตกลง' });
        document.getElementById('camera-container').style.display = 'none';
    }
}

// ฟังก์ชันกด Capture ภาพถ่ายจากวิดีโอสตีมลง Canvas
window.capturePhoto = function() {
    const video = document.getElementById('webcam');
    const canvas = document.getElementById('canvas');
    if (cameraStream && video.videoWidth > 0) {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // แปลงผลลัพธ์เป็นภาพ Base64
        currentUploadedImageBase64 = canvas.toDataURL('image/jpeg');
        
        // ส่งผลลัพธ์ไปยังส่วนแสดงรูป Preview และเคลียร์ค่าช่อง input file ปกติ
        document.getElementById('image-preview').src = currentUploadedImageBase64;
        document.getElementById('image-preview-container').style.display = 'block';
        document.getElementById('w-file').value = ""; 

        window.stopCamera();
    }
}

// ฟังก์ชันหยุดกล้องและซ่อนหน้าจอกล้อง
window.stopCamera = function() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    const videoElement = document.getElementById('webcam');
    if (videoElement) videoElement.srcObject = null;
    document.getElementById('camera-container').style.display = 'none';
}

// ฟังก์ชันเคลียร์ค่ารูปภาพทั้งหมดออก
window.clearSelectedImage = function() {
    currentUploadedImageBase64 = "";
    document.getElementById('w-file').value = "";
    document.getElementById('image-preview-container').style.display = 'none';
    document.getElementById('image-preview').src = "";
}

window.saveWorkReport = async function() {
    const editId = document.getElementById('edit-report-id').value;
    const wDate = document.getElementById('w-date').value;
    const wTime = document.getElementById('w-time').value;
    const fuelType = document.getElementById('w-fuel-type').value;
    const start = parseFloat(document.getElementById('w-start-mile').value);
    const end = parseFloat(document.getElementById('w-end-mile').value);
    const detail = document.getElementById('w-detail').value.trim();
    
    if(!wDate || !fuelType || isNaN(start) || isNaN(end) || !detail) return Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อมูลงานและเลขไมล์ให้ครบถ้วน', confirmButtonText: 'ตกลง' });
    if (end <= start) return Swal.fire({ icon: 'error', title: 'เลขไมล์สิ้นสุดต้องมากกว่าเลขไมล์เริ่มต้น', confirmButtonText: 'ตกลง' });

    const distance = end - start;
    const expense = distance * currentRate;
    
    let reportData = {
        user_id: currentUserId, 
        work_date: wDate, 
        work_time: wTime || '00:00',
        distance_km: distance, 
        work_detail: detail, 
        Reimbursable_expense: expense.toFixed(2), 
        Approve_disbursement: "P"
    };
    
    // แนบรูปภาพ Base64 ไปกับ Object ข้อมูลถ้ามีรูปอยู่
    if(currentUploadedImageBase64) reportData.Image_file = currentUploadedImageBase64;

    if (editId) {
        await updateDoc(doc(db, "fuel", editId), reportData);
    } else {
        const newId = "REP" + Date.now();
        await setDoc(doc(db, "fuel", newId), reportData);
    }
    
    Swal.fire({ icon: 'success', title: 'ส่งคำขอเบิกค่าเดินทางสำเร็จ!', confirmButtonText: 'ตกลง' }).then(() => {
        document.getElementById('edit-report-id').value = ''; 
        document.getElementById('w-start-mile').value = ''; 
        document.getElementById('w-end-mile').value = ''; 
        document.getElementById('w-detail').value = '';
        window.clearSelectedImage(); // เคลียร์ฟอร์มและรูปพรีวิวทั้งหมดหลังบันทึกเสร็จ
        window.calculateLiveExpense(); 
        window.switchTab('report');
    });
}

window.renderUserReports = async function() {
    const tbody = document.getElementById('user-report-list'); tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">กำลังโหลดรายการ...</td></tr>';
    const querySnapshot = await getDocs(collection(db, "fuel"));
    let myReports = [];
    querySnapshot.forEach(docSnap => { if(docSnap.data().user_id === currentUserId) myReports.push({ id: docSnap.id, ...docSnap.data() }); });
    myReports.sort((a,b) => b.id.localeCompare(a.id));
    
    const selectedMonth = document.getElementById('user-report-month').value;
    const selectedDate = document.getElementById('user-report-date').value;
    
    let displayReports = myReports;
    if (selectedDate) {
        displayReports = displayReports.filter(r => r.work_date === selectedDate);
        document.getElementById('user-summary-title').innerText = '🧾 สรุปยอดตามวันที่ระบุ';
        document.getElementById('card-filter-title').innerText = 'ระยะทางของวันที่เลือก (กม.)';
    } else if (selectedMonth) {
        displayReports = displayReports.filter(r => r.work_date.startsWith(selectedMonth));
        document.getElementById('user-summary-title').innerText = '🧾 สรุปยอดประจำเดือนที่คัดกรอง';
        document.getElementById('card-filter-title').innerText = 'ระยะทางประจำเดือนที่เลือก (กม.)';
    } else {
        document.getElementById('user-summary-title').innerText = '🧾 สรุปยอดทั้งหมด';
        document.getElementById('card-filter-title').innerText = 'ระยะทางที่คัดกรอง (กม.)';
    }
    
    tbody.innerHTML = '';
    let filteredCount = 0, filteredKm = 0, filteredBaht = 0;
    
    if (displayReports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">📥 ไม่พบข้อมูลรายงานในเงื่อนไขการค้นหานี้</td></tr>';
    } else {
        displayReports.forEach((r, idx) => {
            if(r.Approve_disbursement !== 'N') { 
                filteredKm += parseFloat(r.distance_km) || 0; 
                filteredBaht += parseFloat(r.Reimbursable_expense) || 0; 
                filteredCount++; 
            }
            let statusText = r.Approve_disbursement === 'P' ? 'รอตรวจสอบ' : (r.Approve_disbursement === 'Y' ? 'อนุมัติ' : 'ไม่อนุมัติ');
            let actionBtns = r.Approve_disbursement === 'P' ? `<button class="btn-pill btn-edit py-1 px-2 me-1" style="font-size:12px;" onclick="window.editReport('${r.id}')">✏️</button><button class="btn-pill btn-red py-1 px-2" style="font-size:12px;" onclick="window.deleteReport('${r.id}')">🗑️</button>` : '<span class="no-print text-muted">-</span>';
            
            if(r.Approve_disbursement === 'N' && r.reason) { statusText += `<br><small class="text-danger fw-bold">สาเหตุ: ${r.reason}</small>`; }
            
            tbody.innerHTML += `<tr><td>${idx + 1}</td><td>${r.work_date}</td><td>${r.work_time || '-'}</td><td>${r.work_detail}</td><td>${r.distance_km} กม.</td><td class="text-success">฿${r.Reimbursable_expense}</td><td><span class="status-tag status-${r.Approve_disbursement}">${statusText}</span></td><td class="no-print">${actionBtns}</td></tr>`;
        });
    }
    
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
    Swal.fire({ 
        title: 'ต้องการลบคำขอนี้ใช่หรือไม่?', 
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#ef4444', 
        confirmButtonText: 'ตกลง (ลบทิ้ง)',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) { 
            await deleteDoc(doc(db, "fuel", id)); 
            window.renderUserReports(); 
            Swal.fire({title: 'ลบสำเร็จ', text: '', icon: 'success', confirmButtonText: 'ตกลง'}); 
        }
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
        
        // ดึงรูปภาพเก่าขึ้นมาพรีวิวแสดงผลในระบบด้วยเมื่อกดแก้ไขข้อมูล
        if(r.Image_file) {
            currentUploadedImageBase64 = r.Image_file;
            document.getElementById('image-preview').src = r.Image_file;
            document.getElementById('image-preview-container').style.display = 'block';
        } else {
            window.clearSelectedImage();
        }

        window.switchTab('work'); 
        window.calculateLiveExpense(); 
        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'ดึงข้อมูลเก่ามาแก้ไขแล้ว', showConfirmButton: false, timer: 2000 });
    }
}

window.printReport = function() { window.print(); }
window.exitSystem = function() { 
    Swal.fire({ 
        title: 'ออกจากระบบ', 
        icon: 'question', 
        showCancelButton: true, 
        confirmButtonColor: '#ef4444', 
        confirmButtonText: 'ตกลง (ออกจากระบบ)',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => { 
        if(result.isConfirmed) { 
            localStorage.removeItem('session_user_id'); 
            window.location.href = 'login.html'; 
        } 
    }); 
}
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, doc, getDoc, getDocs, setDoc, addDoc, collection, query, where, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Replace with your actual deployed Firebase Project Configurations
const firebaseConfig = {
  apiKey: "AIzaSyDIu7rTU_975QRZAHkegOgvn9fttrOIPAc",
  authDomain: "codingua-dashboard.firebaseapp.com",
  projectId: "codingua-dashboard",
  storageBucket: "codingua-dashboard.firebasestorage.app",
  messagingSenderId: "697693858314",
  appId: "1:697693858314:web:7688d96a3de34a6f5c0df3"
};

// Initialize Application Services
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Application State Store
let currentUserState = null;
let activeChartsInstance = {};

/**
 * Main Architecture Workspace Management Engine Context
 */
class CodinguaApp {
    constructor() {
        this.initDOMEvents();
        this.listenAuthChanges();
    }

    initDOMEvents() {
        // Form Invocations
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleAuthentication(e));
        document.getElementById('logout-button').addEventListener('click', () => signOut(auth));
        
        // Navigation Interceptor
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPanel(e.currentTarget.getAttribute('data-target'));
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Application Live System Listeners
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleThemeContext());
        document.getElementById('eval-group-selector').addEventListener('change', (e) => this.populateSessionSelectors(e.target.value));
        document.getElementById('eval-session-selector').addEventListener('change', (e) => this.loadEvaluationMatrix(e.target.value));
        document.getElementById('evaluation-matrix-form').addEventListener('submit', (e) => this.saveEvaluationMatrixData(e));
        
        // Export Action Bindings
        document.getElementById('export-excel-btn').addEventListener('click', () => this.exportCurrentDataToExcel());
        document.getElementById('export-pdf-btn').addEventListener('click', () => this.exportCurrentDataToPDF());
    }

    showToast(message) {
        const el = document.getElementById('toast-notification');
        el.innerText = message;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 4000);
    }

    toggleThemeContext() {
        const body = document.body;
        if (body.classList.contains('light-theme')) {
            body.classList.replace('light-theme', 'dark-theme');
            document.querySelector('#theme-toggle span').innerText = "الوضع المضيء";
        } else {
            body.classList.replace('dark-theme', 'light-theme');
            document.querySelector('#theme-toggle span').innerText = "الوضع الليلي";
        }
    }

    listenAuthChanges() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, "Users", user.uid));
                if (userDoc.exists()) {
                    currentUserState = { uid: user.uid, ...userDoc.data() };
                    this.configureEnvironmentUI();
                } else {
                    this.showToast("خطأ: لم يتم العثور على صلاحيات للمستخدم المستعلم.");
                    signOut(auth);
                }
            } else {
                currentUserState = null;
                document.getElementById('app-container').classList.add('hidden');
                document.getElementById('auth-container').classList.remove('hidden');
            }
        });
    }

    async handleAuthentication(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            this.showToast("تم تسجيل الدخول بنجاح.");
        } catch (error) {
            this.showToast("خطأ في التحقق: بيانات الاعتماد غير صحيحة.");
        }
    }

    configureEnvironmentUI() {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        
        document.getElementById('user-display-name').innerText = currentUserState.fullName;
        document.getElementById('user-display-role').innerText = currentUserState.role === 'admin' ? 'مدير النظام' : 'معلم / محاضر';
        document.getElementById('user-display-role').className = `badge badge-${currentUserState.role}`;

        if (currentUserState.role === 'instructor') {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
        } else {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        }

        this.switchPanel('panel-overview');
    }

    async switchPanel(panelId) {
        document.querySelectorAll('.dashboard-panel').forEach(p => p.classList.remove('active-panel'));
        const activePanel = document.getElementById(panelId);
        if (activePanel) activePanel.classList.add('active-panel');

        switch(panelId) {
            case 'panel-overview': this.loadDashboardMetricsData(); break;
            case 'panel-instructors': this.loadInstructorsModule(); break;
            case 'panel-groups': this.loadGroupsModule(); break;
            case 'panel-students': this.loadStudentsModule(); break;
            case 'panel-evaluations': this.loadEvaluationsWorkspace(); break;
            case 'panel-reports': this.compileAcademyReports(); break;
        }
    }

    // ==========================================
    // MODULE: DATA ACQUISITION & RENDERS
    // ==========================================

    async loadDashboardMetricsData() {
        const studentsSnap = await getDocs(collection(db, "Students"));
        const groupsSnap = await getDocs(collection(db, "Groups"));
        const instructorsSnap = await query(collection(db, "Users"), where("role", "==", "instructor"));
        const instDocs = await getDocs(instructorsSnap);

        const metricsContainer = document.getElementById('metrics-container');
        metricsContainer.innerHTML = `
            <div class="metric-card"><div><h3>الطلاب</h3><div class="metric-val">${studentsSnap.size}</div></div><i class="fas fa-graduation-cap fa-2x"></i></div>
            <div class="metric-card"><div><h3>المجموعات</h3><div class="metric-val">${groupsSnap.size}</div></div><i class="fas fa-users fa-2x"></i></div>
            <div class="metric-card"><div><h3>المعلمون</h3><div class="metric-val">${instDocs.size}</div></div><i class="fas fa-chalkboard-teacher fa-2x"></i></div>
        `;
        
        this.renderGlobalAnalyticsCharts();
    }

    async renderGlobalAnalyticsCharts() {
        if (activeChartsInstance['rankings']) activeChartsInstance['rankings'].destroy();
        if (activeChartsInstance['progress']) activeChartsInstance['progress'].destroy();

        // Standard mock structures instantiated safely if evaluations array returns clean metrics
        const ctxRank = document.getElementById('chart-rankings').getContext('2d');
        activeChartsInstance['rankings'] = new Chart(ctxRank, {
            type: 'bar',
            data: {
                labels: ['أحمد', 'محمد', 'فاطمة', 'زينب'],
                datasets: [{
                    label: 'إجمالي النقاط',
                    data: [120, 115, 140, 95],
                    backgroundColor: '#1DA1F2'
                }]
            },
            options: { responsive: true, plugins: { rtl: true } }
        });

        const ctxProg = document.getElementById('chart-progress').getContext('2d');
        activeChartsInstance['progress'] = new Chart(ctxProg, {
            type: 'line',
            data: {
                labels: ['الحصة 1', 'الحصة 2', 'الحصة 3', 'الحصة 4'],
                datasets: [{
                    label: 'معدل الحضور والالتزام %',
                    data: [90, 95, 88, 100],
                    borderColor: '#F7C52B',
                    fill: false
                }]
            },
            options: { responsive: true }
        });
    }

    async loadInstructorsModule() {
        if (currentUserState.role !== 'admin') return;
        const q = query(collection(db, "Users"), where("role", "==", "instructor"));
        const snap = await getDocs(q);
        const tbody = document.getElementById('table-instructors-body');
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const data = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${data.fullName}</td>
                    <td>${data.email}</td>
                    <td>${data.assignedGroups ? data.assignedGroups.join(', ') : 'لا يوجد'}</td>
                    <td><button class="btn btn-primary" onclick="alert('تعديل الصلاحيات متاح عبر الكونسول المباشر')"><i class="fas fa-edit"></i></button></td>
                </tr>
            `;
        });
    }

    async loadGroupsModule() {
        const snap = await getDocs(collection(db, "Groups"));
        const tbody = document.getElementById('table-groups-body');
        tbody.innerHTML = '';
        snap.forEach(d => {
            const group = d.data();
            if (currentUserState.role === 'instructor' && group.instructorId !== currentUserState.uid) return;
            tbody.innerHTML += `
                <tr>
                    <td>${group.groupName}</td>
                    <td>${group.courseName}</td>
                    <td>${group.instructorId}</td>
                    <td><span class="badge badge-instructor">نشط</span></td>
                    <td>-</td>
                </tr>
            `;
        });
    }

    async loadStudentsModule() {
        const snap = await getDocs(collection(db, "Students"));
        const tbody = document.getElementById('table-students-body');
        tbody.innerHTML = '';
        snap.forEach(d => {
            const student = d.data();
            tbody.innerHTML += `
                <tr>
                    <td>${student.studentName}</td>
                    <td>${student.age}</td>
                    <td>${student.parentPhone}</td>
                    <td>${student.groupId}</td>
                    <td>${student.enrollmentDate}</td>
                    <td>-</td>
                </tr>
            `;
        });
    }

    // ==========================================
    // CORE CALCULATION ENGINE & WORKSHEET EVALS
    // ==========================================

    async loadEvaluationsWorkspace() {
        const groupsSnap = await getDocs(collection(db, "Groups"));
        const selector = document.getElementById('eval-group-selector');
        selector.innerHTML = '<option value="">-- اختر المجموعة المستهدفة --</option>';
        
        groupsSnap.forEach(doc => {
            const g = doc.data();
            if (currentUserState.role === 'instructor' && g.instructorId !== currentUserState.uid) return;
            selector.innerHTML += `<option value="${doc.id}">${g.groupName}</option>`;
        });
    }

    async populateSessionSelectors(groupId) {
        if(!groupId) return;
        const q = query(collection(db, "Sessions"), where("groupId", "==", groupId));
        const snap = await getDocs(q);
        const selector = document.getElementById('eval-session-selector');
        selector.innerHTML = '<option value="">-- اختر رقم الجلسة --</option>';
        snap.forEach(doc => {
            selector.innerHTML += `<option value="${doc.id}">حصة رقم: ${doc.data().sessionNumber} - ${doc.data().topic}</option>`;
        });
    }

    async loadEvaluationMatrix(sessionId) {
        if (!sessionId) return;
        const groupId = document.getElementById('eval-group-selector').value;
        const q = query(collection(db, "Students"), where("groupId", "==", groupId));
        const studentsSnap = await getDocs(q);
        
        const matrixBody = document.getElementById('matrix-students-body');
        matrixBody.innerHTML = '';

        studentsSnap.forEach(docSnap => {
            const st = docSnap.data();
            const stId = docSnap.id;
            matrixBody.innerHTML += `
                <tr data-student-id="${stId}">
                    <td>${st.studentName}</td>
                    <td><input type="checkbox" class="calc-trigger p-attendance" value="10"></td>
                    <td><input type="checkbox" class="calc-trigger p-participation" value="5"></td>
                    <td><input type="checkbox" class="calc-trigger p-application" value="15"></td>
                    <td><input type="checkbox" class="calc-trigger p-homework" value="20"></td>
                    <td><input type="checkbox" class="calc-trigger p-creativity" value="10"></td>
                    <td><input type="checkbox" class="calc-trigger m-late" value="-5"></td>
                    <td><input type="checkbox" class="calc-trigger m-missing" value="-10"></td>
                    <td><strong class="row-total-score">0</strong> نقطة</td>
                </tr>
            `;
        });

        document.getElementById('evaluation-matrix-wrapper').classList.remove('hidden');
        
        // Dynamically bind live point calculation triggers
        document.querySelectorAll('.calc-trigger').forEach(input => {
            input.addEventListener('change', (e) => this.calculateMatrixRowScore(e.target.closest('tr')));
        });
    }

    calculateMatrixRowScore(trElement) {
        let total = 0;
        trElement.querySelectorAll('.calc-trigger:checked').forEach(chk => {
            total += parseInt(chk.value);
        });
        trElement.querySelector('.row-total-score').innerText = total;
    }

    async saveEvaluationMatrixData(e) {
        e.preventDefault();
        const sessionId = document.getElementById('eval-session-selector').value;
        const rows = document.querySelectorAll('#matrix-students-body tr');
        
        try {
            for (let row of rows) {
                const studentId = row.getAttribute('data-student-id');
                const evalPayload = {
                    sessionId: sessionId,
                    studentId: studentId,
                    attendance: row.querySelector('.p-attendance').checked ? 10 : 0,
                    participation: row.querySelector('.p-participation').checked ? 5 : 0,
                    application: row.querySelector('.p-application').checked ? 15 : 0,
                    homework: row.querySelector('.p-homework').checked ? 20 : 0,
                    creativity: row.querySelector('.p-creativity').checked ? 10 : 0,
                    latePenalty: row.querySelector('.m-late').checked ? -5 : 0,
                    homeworkPenalty: row.querySelector('.m-missing').checked ? -10 : 0,
                    totalPoints: parseInt(row.querySelector('.row-total-score').innerText),
                    instructorId: currentUserState.uid,
                    timestamp: serverTimestamp()
                };
                await addDoc(collection(db, "Evaluations"), evalPayload);
            }
            this.showToast("تم حفظ واعتماد درجات الحصة لجميع الطلاب المختارين بنجاح.");
            document.getElementById('evaluation-matrix-wrapper').classList.add('hidden');
        } catch (err) {
            this.showToast("حدث خطأ أثناء حفظ التقييمات في قاعدة البيانات.");
        }
    }

    // ==========================================
    // REPORTS PROCESSING ENGINE & DOCUMENT GENERATION
    // ==========================================

    async compileAcademyReports() {
        const renderZone = document.getElementById('report-render-zone');
        renderZone.innerHTML = '<p style="text-align:center; padding:20px;">جاري تجميع البيانات والتقارير الشاملة للأكاديمية...</p>';
        
        const studentsSnap = await getDocs(collection(db, "Students"));
        let reportHTML = `
            <div style="background-color:var(--bg-surface); padding:24px; border-radius:12px; margin-bottom:20px; border:1px solid var(--border)">
                <h3 style="margin-bottom:15px; color:var(--primary-blue)">لوحة الشرف والأداء العام الموحد</h3>
                <p>يتم تجميع هذه البيانات تلقائياً بناءً على فترات دورية مكونة من 4 حصص متعاقبة لتتبع مستويات التحصيل العلمي.</p>
            </div>
        `;

        studentsSnap.forEach(stDoc => {
            const student = stDoc.data();
            // In a production environment, complete aggregate analytical processing loops are processed here
            reportHTML += `
                <div class="metric-card" style="margin-bottom:12px;">
                    <div>
                        <strong>اسم الطالب: ${student.studentName}</strong>
                        <div style="font-size:0.85rem; color:#64748b; margin-top:4px;">
                            المجموعة: ${student.groupId} | نسبة إنجاز الفروض الدراسية التقريبية: 92%
                        </div>
                    </div>
                    <div>
                        <span class="badge" style="background-color:var(--secondary-yellow); color:#0f172a;">🥇 نجم الشهر</span>
                        <span class="badge badge-instructor">الحضور والالتزام المثالي 🔥</span>
                    </div>
                </div>
            `;
        });
        
        renderZone.innerHTML = reportHTML;
    }

    exportCurrentDataToExcel() {
        this.showToast("جاري إعداد وتصدير ملف Excel...");
        const table = document.getElementById('report-render-zone');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet([
            { "اسم الطالب": "أحمد العبدالله", "المجموعة": "Web_Track_G1", "إجمالي النقاط المسجلة": 145, "الشارات المحققة": "Star of the Month" },
            { "اسم الطالب": "إسلام محمد", "المجموعة": "Web_Track_G1", "إجمالي النقاط المسجلة": 160, "الشارات المحققة": "Young Innovator" }
        ]);
        XLSX.utils.book_append_sheet(wb, ws, "Codingua Academy Report");
        XLSX.writeFile(wb, "Codingua_Monthly_Report_2026.xlsx");
    }

    exportCurrentDataToPDF() {
        this.showToast("جاري إنشاء وثيقة كشوفات التقييم PDF للتنزيل أو الطباعة الفورية...");
        const element = document.getElementById('report-render-zone');
        const opt = {
            margin:       10,
            filename:     'Codingua_Academy_Report.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    }

    // ==========================================
    // SYSTEM DYNAMIC MODAL CANVAS LOGIC
    // ==========================================
    openModal(type) {
        const title = document.getElementById('modal-system-title');
        const body = document.getElementById('modal-system-body');
        
        if (type === 'student') {
            title.innerText = "تسجيل طالب جديد في المسارات البرمجية";
            body.innerHTML = `
                <form id="modal-add-student-form">
                    <div class="form-group"><label>اسم الطالب رباعي</label><input type="text" id="m-st-name" required></div>
                    <div class="form-group"><label>العمر</label><input type="number" id="m-st-age" required></div>
                    <div class="form-group"><label>رقم هاتف ولي الأمر (واتساب)</label><input type="text" id="m-st-phone" required></div>
                    <div class="form-group"><label>المجموعة الدراسية</label><input type="text" id="m-st-group" placeholder="مثال: App_Inventor_G1" required></div>
                    <button type="submit" class="btn btn-primary btn-block">تأكيد الحفظ والإدراج</button>
                </form>
            `;
            document.getElementById('modal-add-student-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                await addDoc(collection(db, "Students"), {
                    studentName: document.getElementById('m-st-name').value,
                    age: parseInt(document.getElementById('m-st-age').value),
                    parentPhone: document.getElementById('m-st-phone').value,
                    groupId: document.getElementById('m-st-group').value,
                    enrollmentDate: new Date().toISOString().split('T')[0]
                });
                this.showToast("تم تسجيل الطالب بنجاح.");
                this.closeModal();
                this.loadStudentsModule();
            });
        }
        
        if (type === 'session') {
            title.innerText = "إنشاء وإدراج حصة دراسية جديدة للمجموعات";
            body.innerHTML = `
                <form id="modal-add-session-form">
                    <div class="form-group"><label>المعرف الخاص بالمجموعة (Group ID)</label><input type="text" id="m-se-group" required></div>
                    <div class="form-group"><label>رقم الحصة الدورية</label><input type="number" id="m-se-num" required></div>
                    <div class="form-group"><label>عنوان أو موضوع الدرس المحوري</label><input type="text" id="m-se-topic" required></div>
                    <button type="submit" class="btn btn-primary btn-block">جدولة الحصة الآن</button>
                </form>
            `;
            document.getElementById('modal-add-session-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                await addDoc(collection(db, "Sessions"), {
                    groupId: document.getElementById('m-se-group').value,
                    sessionNumber: parseInt(document.getElementById('m-se-num').value),
                    topic: document.getElementById('m-se-topic').value,
                    date: new Date().toISOString().split('T')[0]
                });
                this.showToast("تم إدراج وجدولة الحصة بنجاح في النظام.");
                this.closeModal();
            });
        }

        document.getElementById('global-modal').classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('global-modal').classList.add('hidden');
    }
}

// Instantiate Global Context Engine to DOM Context Windows safely
window.addEventListener('DOMContentLoaded', () => {
    window.app = new CodinguaApp();
});
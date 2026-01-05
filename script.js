// API base URL
const API_BASE_URL = 'http://localhost:5000/api';

// DOM elementlari
let currentGiveawayId = null;

// Menu toggle
function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

// Scroll funksiyalari
function scrollToHow() {
    document.getElementById('how-it-works').scrollIntoView({
        behavior: 'smooth'
    });
}

function startGiveaway() {
    document.getElementById('giveaway-form').scrollIntoView({
        behavior: 'smooth'
    });
}

// Tanlov yaratish
async function createGiveaway() {
    const postUrl = document.getElementById('postUrl').value;
    const winnersCount = document.getElementById('winnersCount').value;
    const selectionMethod = document.querySelector('input[name="selectionMethod"]:checked').value;
    
    if (!postUrl || !postUrl.includes('instagram.com')) {
        alert('Iltimos, Instagram postining to\'g\'ri linkini kiriting!');
        return;
    }
    
    const createBtn = document.getElementById('createBtn');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    
    createBtn.style.display = 'none';
    loading.style.display = 'block';
    results.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE_URL}/create-giveaway`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                post_url: postUrl,
                winners_count: winnersCount,
                selection_method: selectionMethod
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentGiveawayId = data.giveaway_id;
            
            loading.style.display = 'none';
            
            results.innerHTML = `
                <div class="success-message">
                    <h3><i class="fas fa-check-circle"></i> Tanlov Muvaffaqiyatli Yaratildi!</h3>
                    <p><strong>Post:</strong> ${postUrl}</p>
                    <p><strong>Ishtirokchilar soni:</strong> ${data.total_participants}</p>
                    <p><strong>G'oliblar soni:</strong> ${winnersCount}</p>
                    <p><strong>Tanlov usuli:</strong> ${getMethodName(selectionMethod)}</p>
                    
                    <div style="margin-top: 20px;">
                        <button class="btn-primary" onclick="pickWinners(${data.giveaway_id})">
                            <i class="fas fa-trophy"></i> G'oliblarni Tanlash
                        </button>
                        <button class="btn-secondary" onclick="viewDashboard(${data.giveaway_id})" style="margin-left: 10px;">
                            <i class="fas fa-eye"></i> Batafsil Ko'rish
                        </button>
                    </div>
                </div>
            `;
            results.style.display = 'block';
            
            // Barcha ishtirokchilarni ko'rsatish
            displayParticipants(data.post_data.participants);
        } else {
            throw new Error(data.error || 'Xatolik yuz berdi');
        }
    } catch (error) {
        loading.style.display = 'none';
        createBtn.style.display = 'block';
        
        results.innerHTML = `
            <div class="error-message">
                <h3><i class="fas fa-exclamation-circle"></i> Xatolik!</h3>
                <p>${error.message}</p>
                <p><small>Eslatma: Haqiqiy loyihada Instagram API token kerak bo'ladi. Bu demo versiyada simulyatsiya qilingan ma'lumotlar ishlatilmoqda.</small></p>
            </div>
        `;
        results.style.display = 'block';
    }
}

// G'oliblarni tanlash
async function pickWinners(giveawayId) {
    try {
        const response = await fetch(`${API_BASE_URL}/pick-winners/${giveawayId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayWinners(data.winners);
            
            // Natijalarni yangilash
            setTimeout(() => {
                viewDashboard(giveawayId);
            }, 2000);
        } else {
            alert('Xatolik: ' + data.error);
        }
    } catch (error) {
        alert('Xatolik yuz berdi: ' + error.message);
    }
}

// Dashboard ko'rish
async function viewDashboard(giveawayId) {
    try {
        const response = await fetch(`${API_BASE_URL}/get-giveaway/${giveawayId}`);
        const data = await response.json();
        
        if (data.success) {
            showDashboard(data);
        } else {
            alert('Xatolik: ' + data.error);
        }
    } catch (error) {
        alert('Xatolik yuz berdi: ' + error.message);
    }
}

// Dashboard modalini ko'rsatish
function showDashboard(data) {
    const modal = document.getElementById('dashboardModal');
    const content = document.getElementById('dashboardContent');
    
    const giveaway = data.giveaway;
    const participants = data.participants;
    
    let html = `
        <div class="dashboard">
            <div class="dashboard-header">
                <h3>Tanlov #${giveaway.id}</h3>
                <p><strong>Holati:</strong> <span class="status ${giveaway.status}">${giveaway.status}</span></p>
            </div>
            
            <div class="dashboard-info">
                <div class="info-card">
                    <h4><i class="fas fa-link"></i> Post Linki</h4>
                    <p><a href="${giveaway.post_url}" target="_blank">${giveaway.post_url}</a></p>
                </div>
                
                <div class="info-card">
                    <h4><i class="fas fa-users"></i> Ishtirokchilar</h4>
                    <p>${participants.length} kishi</p>
                </div>
                
                <div class="info-card">
                    <h4><i class="fas fa-trophy"></i> G'oliblar</h4>
                    <p>${giveaway.winners_count} kishi</p>
                </div>
                
                <div class="info-card">
                    <h4><i class="fas fa-method"></i> Tanlov usuli</h4>
                    <p>${getMethodName(giveaway.selection_method)}</p>
                </div>
            </div>
    `;
    
    if (giveaway.results && giveaway.results.winners) {
        html += `
            <div class="winners-section">
                <h4><i class="fas fa-crown"></i> G'oliblar Ro'yxati</h4>
                <div class="winners-list">
        `;
        
        giveaway.results.winners.forEach(winner => {
            html += `
                <div class="winner-item">
                    <i class="fas fa-user-circle"></i>
                    <div>
                        <strong>${winner.username}</strong>
                        <small>${winner.entry_type === 'comment' ? 'Izoh' : 'Like'} orqali</small>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                <button class="btn-secondary" onclick="downloadResults(${giveaway.id})">
                    <i class="fas fa-download"></i> Natijalarni Yuklab Olish
                </button>
            </div>
        `;
    } else if (giveaway.status === 'active') {
        html += `
            <div class="action-section">
                <p>G'oliblar hali tanlanmagan.</p>
                <button class="btn-primary" onclick="pickWinners(${giveaway.id})">
                    <i class="fas fa-trophy"></i> G'oliblarni Tanlash
                </button>
            </div>
        `;
    }
    
    html += `
            <div class="participants-section">
                <h4><i class="fas fa-list"></i> Barcha Ishtirokchilar (${participants.length})</h4>
                <div class="participants-list">
    `;
    
    participants.forEach(participant => {
        html += `
            <div class="participant-item">
                <i class="fas fa-user"></i>
                <span>${participant.username}</span>
                <span class="entry-type ${participant.entry_type}">
                    ${participant.entry_type === 'comment' ? 'Izoh' : 'Like'}
                </span>
            </div>
        `;
    });
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
    modal.style.display = 'flex';
}

// Modalni yopish
function closeModal() {
    document.getElementById('dashboardModal').style.display = 'none';
}

// Natijalarni yuklab olish
function downloadResults(giveawayId) {
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/get-giveaway/${giveawayId}`;
    link.download = `giveaway-${giveawayId}-results.json`;
    link.click();
}

// Yordamchi funksiyalar
function getMethodName(method) {
    const methods = {
        'comments': 'Faqat Izohlar',
        'likes': 'Faqat Layklar',
        'both': 'Ikkalasi Ham'
    };
    return methods[method] || method;
}

function displayParticipants(participants) {
    const results = document.getElementById('results');
    
    let participantsHtml = `
        <div class="participants-preview" style="margin-top: 20px;">
            <h4><i class="fas fa-users"></i> Ishtirokchilar (${participants.length})</h4>
            <div class="participants-list" style="max-height: 200px; overflow-y: auto; margin-top: 10px;">
    `;
    
    participants.forEach(p => {
        participantsHtml += `
            <div style="padding: 8px 12px; background: white; margin-bottom: 5px; border-radius: 5px; display: flex; justify-content: space-between;">
                <span>${p.username}</span>
                <span style="color: ${p.entry_type === 'comment' ? '#3B82F6' : '#10B981'}; font-size: 12px;">
                    ${p.entry_type === 'comment' ? 'Izoh' : 'Like'}
                </span>
            </div>
        `;
    });
    
    participantsHtml += `</div></div>`;
    
    results.innerHTML += participantsHtml;
}

function displayWinners(winners) {
    const results = document.getElementById('results');
    
    let winnersHtml = `
        <div class="winner-list" style="margin-top: 20px;">
            <h3><i class="fas fa-crown"></i> G'oliblar!</h3>
    `;
    
    if (winners.length === 0) {
        winnersHtml += `<p>Hech qanday g'olib tanlanmadi.</p>`;
    } else {
        winners.forEach(winner => {
            winnersHtml += `
                <div class="winner-card">
                    <i class="fas fa-trophy"></i>
                    <div>
                        <h4>${winner.username}</h4>
                        <p>${winner.entry_type === 'comment' ? 'Izoh' : 'Like'} orqali qatnashgan</p>
                    </div>
                </div>
            `;
        });
    }
    
    winnersHtml += `</div>`;
    
    const existingWinners = results.querySelector('.winner-list');
    if (existingWinners) {
        existingWinners.remove();
    }
    
    results.innerHTML += winnersHtml;
}

// Modalni tashqariga bosilganda yopish
window.onclick = function(event) {
    const modal = document.getElementById('dashboardModal');
    if (event.target === modal) {
        closeModal();
    }
};

// Sahifa yuklanganda
document.addEventListener('DOMContentLoaded', function() {
    // Instagram link misolini qo'yish
    document.getElementById('postUrl').value = 'https://www.instagram.com/p/Cxample123/';
});

body {
  background: red !important;
}
// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.navbar') && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
        }
    });
    
    // Dashboard Interactive Elements
    initializeDashboard();
    
    // Waitlist Form Handling
    initializeWaitlistForm();
    
    // Smooth Scrolling
    initializeSmoothScroll();
});

function initializeDashboard() {
    // Progress bars animation
    const progressBars = document.querySelectorAll('.progress');
    progressBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => {
            bar.style.width = width;
        }, 300);
    });
    
    // Simulate live data updates
    if (document.querySelector('.dashboard-content')) {
        setInterval(updateLiveData, 10000);
    }
}

function updateLiveData() {
    const balanceElement = document.querySelector('.stat-card .amount');
    if (balanceElement) {
        const currentBalance = parseFloat(balanceElement.textContent.replace('K', ''));
        const randomChange = Math.random() * 10 - 2; // -2 to +8
        const newBalance = currentBalance + randomChange;
        balanceElement.textContent = 'K' + newBalance.toFixed(2);
        
        // Update change indicator
        const changeElement = document.querySelector('.stat-card .change');
        if (changeElement) {
            changeElement.textContent = randomChange >= 0 ? 
                `+K${randomChange.toFixed(2)} this hour` : 
                `K${randomChange.toFixed(2)} this hour`;
        }
    }
}

function initializeWaitlistForm() {
    const waitlistForm = document.getElementById('waitlistForm');
    if (waitlistForm) {
        waitlistForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const interest = document.getElementById('interest').value;
            
            // Show loading state
            const submitBtn = document.querySelector('#waitlistForm button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            submitBtn.disabled = true;
            
            // Simulate API call
            setTimeout(() => {
                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <h3>Welcome to Trust ZedFund!</h3>
                    <p>You're #5,235 on the waitlist. We'll notify you when we launch in your area.</p>
                    <p>Check your email for confirmation and exclusive early member benefits.</p>
                `;
                
                waitlistForm.parentNode.replaceChild(successMessage, waitlistForm);
                
                // Update waitlist counter
                const counter = document.querySelector('.waitlist-counter');
                if (counter) {
                    const currentCount = parseInt(counter.textContent.replace(/,/g, ''));
                    counter.textContent = (currentCount + 1).toLocaleString();
                }
            }, 1500);
        });
    }
}

function initializeSmoothScroll() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                const navLinks = document.querySelector('.nav-links');
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                }
            }
        });
    });
}

// Additional dashboard styles
const dashboardStyles = `
    .avatar-large {
        width: 80px;
        height: 80px;
        background: var(--primary);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        font-weight: 700;
        margin: 0 auto 1rem;
    }
    
    .user-tier {
        text-align: center;
        margin: 1rem 0;
    }
    
    .tier-badge {
        background: var(--secondary);
        color: var(--dark);
        padding: 4px 12px;
        border-radius: 50px;
        font-size: 0.875rem;
        font-weight: 600;
    }
    
    .circles-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-top: 1.5rem;
    }
    
    .circle-card {
        background: white;
        padding: 1.5rem;
        border-radius: var(--radius);
        border: 2px solid #E2E8F0;
        transition: all 0.3s;
    }
    
    .circle-card:hover {
        border-color: var(--primary);
        transform: translateY(-3px);
        box-shadow: var(--shadow);
    }
    
    .circle-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    
    .circle-status {
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 50px;
        font-weight: 600;
    }
    
    .circle-status.active {
        background: #C6F6D5;
        color: #22543D;
    }
    
    .circle-balance {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary);
        margin-bottom: 1rem;
    }
    
    .circle-members {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
        font-size: 0.875rem;
        color: var(--gray);
    }
    
    .progress-bar {
        height: 6px;
        background: #E2E8F0;
        border-radius: 3px;
        overflow: hidden;
        margin: 0.5rem 0;
    }
    
    .progress {
        height: 100%;
        background: var(--success);
        transition: width 1s ease;
    }
    
    .add-circle {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
    }
    
    .add-circle .btn-primary {
        background: white;
        color: var(--dark);
    }
    
    .investments-table {
        overflow-x: auto;
        margin-top: 1.5rem;
    }
    
    table {
        width: 100%;
        border-collapse: collapse;
    }
    
    thead {
        background: #F7FAFC;
    }
    
    th, td {
        padding: 12px 16px;
        text-align: left;
        border-bottom: 1px solid #E2E8F0;
    }
    
    .positive {
        color: var(--success);
        font-weight: 600;
    }
    
    .status-badge {
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 50px;
        font-weight: 600;
    }
    
    .status-badge.active {
        background: #C6F6D5;
        color: #22543D;
    }
    
    .btn-link {
        color: var(--primary);
        text-decoration: none;
        font-weight: 600;
    }
    
    .quick-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin-top: 1.5rem;
    }
    
    .action-card {
        background: white;
        border: 2px solid #E2E8F0;
        padding: 1.5rem;
        border-radius: var(--radius);
        text-align: center;
        text-decoration: none;
        color: var(--dark);
        transition: all 0.3s;
    }
    
    .action-card:hover {
        border-color: var(--primary);
        transform: translateY(-3px);
        box-shadow: var(--shadow);
    }
    
    .action-card i {
        font-size: 2rem;
        color: var(--primary);
        margin-bottom: 0.5rem;
        display: block;
    }
    
    .success-message {
        background: #C6F6D5;
        border: 2px solid #38A169;
        padding: 2rem;
        border-radius: var(--radius);
        text-align: center;
        margin: 2rem 0;
    }
    
    .success-message i {
        font-size: 3rem;
        color: #38A169;
        margin-bottom: 1rem;
    }
`;

// Add dashboard styles to the document
const styleSheet = document.createElement("style");
styleSheet.textContent = dashboardStyles;
document.head.appendChild(styleSheet);
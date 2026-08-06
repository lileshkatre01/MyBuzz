document.addEventListener('DOMContentLoaded', () => {
    // Theme Switcher Logic
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggleBtn) {
            const icon = themeToggleBtn.querySelector('i');
            if (icon) icon.className = 'fa-solid fa-sun';
            themeToggleBtn.style.color = '#f59e0b';
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-theme');
            const icon = themeToggleBtn.querySelector('i');
            if (icon) {
                if (isDark) {
                    icon.className = 'fa-solid fa-sun';
                    themeToggleBtn.style.color = '#f59e0b';
                    localStorage.setItem('theme', 'dark');
                } else {
                    icon.className = 'fa-regular fa-moon';
                    themeToggleBtn.style.color = '';
                    localStorage.setItem('theme', 'light');
                }
            }
        });
    }

    // State Variables
    let currentUser = null;
    let activeTrip = null;
    let routeStops = [];
    let tripLogs = [];
    let lastEndedTrip = null;

    // DOM Elements
    const driverName = document.getElementById('driver-name');
    const logoutBtn = document.getElementById('logout-btn');
    const setupSection = document.getElementById('setup-trip-section');
    const activeSection = document.getElementById('active-trip-section');
    
    // Setup form elements
    const routeSelect = document.getElementById('route-select');
    const busSelect = document.getElementById('bus-select');
    const depTimeSelect = document.getElementById('departure-time-select');
    const startTripBtn = document.getElementById('start-trip-btn');
    
    // Active trip elements
    const activeRouteName = document.getElementById('active-route-name');
    const activeBusDetails = document.getElementById('active-bus-details');
    const endTripBtn = document.getElementById('end-trip-btn');
    const currentStatusDesc = document.getElementById('current-status-desc');
    const driverTimeline = document.getElementById('driver-timeline');

    // Initialize Dashboard
    checkAuthAndInit();

    // 1. Check Authentication Status
    async function checkAuthAndInit() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();

            if (!data.logged_in) {
                window.location.href = '/login';
                return;
            }

            currentUser = data.user;
            if (driverName) {
                driverName.innerHTML = `<i class="fa-solid fa-user-circle"></i> ${currentUser.username}`;
            }

            // Check if there is an active trip running
            checkActiveTrip();

        } catch (err) {
            console.error('Auth verification failed:', err);
            window.location.href = '/login';
        }
    }

    // 2. Check for Active Trip
    async function checkActiveTrip() {
        try {
            const response = await fetch('/api/driver/active_trip');
            const data = await response.json();

            if (data.has_active_trip) {
                activeTrip = data.trip;
                // Fetch trip status and stops
                await loadActiveTripDetails(activeTrip.id);
            } else {
                activeTrip = null;
                showSetupSection();
            }
        } catch (err) {
            console.error('Error checking active trip:', err);
        }
    }

    // 3. Show Setup Section & Load Dropdowns
    async function showSetupSection() {
        setupSection.classList.remove('hidden');
        activeSection.classList.add('hidden');

        // Check if there is a resume-able trip
        checkLastEndedTrip();

        try {
            // Load Routes
            const routeRes = await fetch('/api/routes');
            const routes = await routeRes.json();
            routeSelect.innerHTML = '<option value="">-- Choose Route --</option>';
            routes.forEach(r => {
                routeSelect.innerHTML += `<option value="${r.id}">${r.source} &rarr; ${r.destination}</option>`;
            });

            // Load Buses
            const busRes = await fetch('/api/buses');
            const buses = await busRes.json();
            busSelect.innerHTML = '<option value="">-- Choose Bus --</option>';
            buses.forEach(b => {
                busSelect.innerHTML += `<option value="${b.id}">${b.bus_number} (${b.bus_type})</option>`;
            });

        } catch (err) {
            console.error('Error loading setup dropdowns:', err);
        }
    }

    // 3a. Check for last ended trip to resume
    async function checkLastEndedTrip() {
        const resumeContainer = document.getElementById('resume-trip-container');
        const resumeRouteName = document.getElementById('resume-route-name');
        const resumeDetails = document.getElementById('resume-details');

        if (!resumeContainer) return;

        try {
            const response = await fetch('/api/driver/last_ended_trip');
            const data = await response.json();

            if (data.has_last_trip) {
                lastEndedTrip = data.trip;
                resumeContainer.classList.remove('hidden');
                
                if (resumeRouteName) {
                    resumeRouteName.innerHTML = `${lastEndedTrip.source} &rarr; ${lastEndedTrip.destination}`;
                }
                
                if (resumeDetails) {
                    const stopName = lastEndedTrip.stop_name ? lastEndedTrip.stop_name.split(' (')[0] : 'First Stop';
                    const statusText = lastEndedTrip.current_status === 'left' ? 'Left' : 'At';
                    resumeDetails.innerHTML = `Previously ended: ${statusText} <strong>${stopName}</strong> | Bus: ${lastEndedTrip.bus_number} | Scheduled: ${lastEndedTrip.departure_time}`;
                }
            } else {
                lastEndedTrip = null;
                resumeContainer.classList.add('hidden');
            }
        } catch (err) {
            console.error('Error checking last ended trip:', err);
            resumeContainer.classList.add('hidden');
        }
    }

    // 4. Start New Trip
    if (startTripBtn) {
        startTripBtn.addEventListener('click', async () => {
            const busId = busSelect.value;
            const routeId = routeSelect.value;
            const depTime = depTimeSelect.value;

            const routeWrapper = document.getElementById('route-select-wrapper');
            const busWrapper = document.getElementById('bus-select-wrapper');

            // Reset validation errors
            if (routeWrapper) routeWrapper.classList.remove('validation-error');
            if (busWrapper) busWrapper.classList.remove('validation-error');

            let hasError = false;

            if (!routeId) {
                if (routeWrapper) routeWrapper.classList.add('validation-error');
                hasError = true;
            }
            if (!busId) {
                if (busWrapper) busWrapper.classList.add('validation-error');
                hasError = true;
            }

            if (hasError) return;

            startTripBtn.disabled = true;
            startTripBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Starting Journey...';

            try {
                const response = await fetch('/api/trips/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bus_id: busId,
                        route_id: routeId,
                        departure_time: depTime
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    await checkActiveTrip();
                } else {
                    alert(data.error || 'Failed to start trip.');
                }
            } catch (err) {
                console.error('Error starting trip:', err);
                alert('An error occurred.');
            } finally {
                startTripBtn.disabled = false;
                startTripBtn.innerHTML = '<span>Start Trip Now</span>';
            }
        });
    }

    // Add change listeners to clear error outlines instantly
    if (routeSelect) {
        routeSelect.addEventListener('change', () => {
            const wrapper = document.getElementById('route-select-wrapper');
            if (routeSelect.value && wrapper) {
                wrapper.classList.remove('validation-error');
            }
        });
    }
    if (busSelect) {
        busSelect.addEventListener('change', () => {
            const wrapper = document.getElementById('bus-select-wrapper');
            if (busSelect.value && wrapper) {
                wrapper.classList.remove('validation-error');
            }
        });
    }

    // 5. Load Active Trip Details & Logs
    async function loadActiveTripDetails(tripId) {
        try {
            const response = await fetch(`/api/trips/${tripId}/status`);
            if (!response.ok) throw new Error('Failed to load trip status');
            
            const data = await response.json();
            activeTrip = data.trip;
            routeStops = data.stops;
            tripLogs = data.logs;

            renderActiveTripDashboard();

        } catch (err) {
            console.error('Error loading active trip details:', err);
        }
    }

    // 6. Render Active Trip Panel
    function renderActiveTripDashboard() {
        setupSection.classList.add('hidden');
        activeSection.classList.remove('hidden');

        // Re-enable force end trip button since a journey is active/resumed
        if (endTripBtn) {
            endTripBtn.disabled = false;
        }

        activeRouteName.innerHTML = `${activeTrip.source} &rarr; ${activeTrip.destination}`;
        activeBusDetails.innerHTML = `<i class="fa-solid fa-bus"></i> Bus: ${activeTrip.bus_number} (${activeTrip.bus_type}) | Scheduled: ${activeTrip.departure_time}`;

        // Find Current Stop & Status
        const currentStopId = activeTrip.current_stop_id;
        const currentStatus = activeTrip.current_status;

        const currentStop = routeStops.find(s => s.id === currentStopId);
        
        if (currentStatus === 'reached') {
            const nextStop = routeStops.find(s => s.stop_order === currentStop.stop_order + 1);
            const currentStopName = currentStop.stop_name.split(' (')[0];
            if (nextStop) {
                const nextStopName = nextStop.stop_name.split(' (')[0];
                currentStatusDesc.innerHTML = `At <span class="text-highlight">${currentStopName}</span>, Next Stop: <span class="text-highlight">${nextStopName}</span>`;
            } else {
                currentStatusDesc.innerHTML = `At Final Destination: <span class="text-highlight">${currentStopName}</span>`;
            }
        } else if (currentStatus === 'left') {
            const nextStop = routeStops.find(s => s.stop_order === currentStop.stop_order + 1);
            const currentStopName = currentStop.stop_name.split(' (')[0];
            if (nextStop) {
                const nextStopName = nextStop.stop_name.split(' (')[0];
                currentStatusDesc.innerHTML = `In Transit: <span class="text-highlight">${currentStopName} to ${nextStopName}</span>`;
            } else {
                currentStatusDesc.innerHTML = `Left <span class="text-highlight">${currentStopName}</span>`;
            }
        } else {
            currentStatusDesc.innerHTML = 'Not Started Yet';
        }

        // Render Stop Timeline Checkpoints List
        renderTimelineList(currentStop, currentStatus);
    }

    // 7. Render check-in checkpoint timeline list with inline buttons
    function renderTimelineList(currentStop, currentStatus) {
        if (!driverTimeline) return;
        
        driverTimeline.innerHTML = '';
        
        routeStops.forEach((stop, index) => {
            let itemClass = 'driver-timeline-item';
            let badgeIcon = `${index + 1}`;
            let statusMarkup = '';

            const isCurrentStop = currentStop && stop.id === currentStop.id;
            const isPassedStop = currentStop && stop.stop_order < currentStop.stop_order;
            const isNextStop = currentStop && stop.stop_order === currentStop.stop_order + 1 && currentStatus === 'left';

            if (isCurrentStop) {
                itemClass += ' active-stop';
                badgeIcon = currentStatus === 'reached' ? '<i class="fa-solid fa-bus"></i>' : '<i class="fa-solid fa-arrow-right"></i>';
                
                if (currentStatus === 'reached') {
                    // Current stop is reached, show Depart button
                    const nextStop = routeStops.find(s => s.stop_order === stop.stop_order + 1);
                    const nextStopName = nextStop ? nextStop.stop_name.split(' (')[0] : 'End Point';
                    statusMarkup = `<button class="btn-action-sm btn-depart" data-stop-id="${stop.id}" data-status="left">
                                        Start Trip to ${nextStopName}
                                    </button>`;
                } else {
                    // Current stop is left, show Completed status
                    statusMarkup = `<span class="stop-status-tag">Completed</span>`;
                }
            } else if (isPassedStop) {
                itemClass += ' passed';
                badgeIcon = '<i class="fa-solid fa-check"></i>';
                statusMarkup = `<span class="stop-status-tag">Completed</span>`;
            } else if (isNextStop) {
                itemClass += ' next-upcoming';
                badgeIcon = '<i class="fa-solid fa-spinner animate-spin"></i>';
                // Upcoming stop is next to be reached, show Arrive button
                const stopNameShort = stop.stop_name.split(' (')[0];
                statusMarkup = `<button class="btn-action-sm btn-arrive" data-stop-id="${stop.id}" data-status="reached">
                                    Reached ${stopNameShort}
                                </button>`;
            } else {
                statusMarkup = `<span class="stop-status-tag">Upcoming</span>`;
            }

            driverTimeline.innerHTML += `
                <li class="${itemClass}">
                    <div class="stop-info">
                        <div class="stop-badge">${badgeIcon}</div>
                        <span class="stop-label-name">${stop.stop_name}</span>
                    </div>
                    <div class="stop-action-col">
                        ${statusMarkup}
                    </div>
                </li>
            `;
        });
    }

    // 8. Event delegation on driver-timeline for Arrive/Depart clicks
    if (driverTimeline) {
        driverTimeline.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-action-sm');
            if (!btn) return;

            const stopId = btn.dataset.stopId;
            const status = btn.dataset.status;

            if (!stopId || !status || !activeTrip) return;

            // Disable all action buttons during request
            const allBtns = driverTimeline.querySelectorAll('.btn-action-sm');
            allBtns.forEach(b => b.disabled = true);
            
            btn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i>';

            try {
                const response = await fetch('/api/trips/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        trip_id: activeTrip.id,
                        stop_id: stopId,
                        status: status
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    if (data.is_completed) {
                        alert('Journey Completed! The bus has reached the final destination. The trip has been completed.');
                        activeTrip = null;
                        showSetupSection();
                    } else {
                        // Reload details
                        await loadActiveTripDetails(activeTrip.id);
                    }
                } else {
                    alert(data.error || 'Failed to update check-in.');
                    await loadActiveTripDetails(activeTrip.id);
                }
            } catch (err) {
                console.error('Error during check-in update:', err);
                alert('An error occurred updating the status.');
                await loadActiveTripDetails(activeTrip.id);
            }
        });
    }

    // 10. Handle End Trip Forcefully
    if (endTripBtn) {
        endTripBtn.addEventListener('click', async () => {
            if (!activeTrip) return;

            if (!confirm('Are you sure you want to end this trip forcefully? It will remove this bus from live passenger tracking.')) {
                return;
            }

            endTripBtn.disabled = true;

            try {
                const response = await fetch('/api/trips/end', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trip_id: activeTrip.id })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    activeTrip = null;
                    showSetupSection();
                } else {
                    alert(data.error || 'Failed to end trip.');
                    endTripBtn.disabled = false;
                }
            } catch (err) {
                console.error('Error ending trip:', err);
                alert('An error occurred.');
                endTripBtn.disabled = false;
            }
        });
    }

    // 11. Handle Log out
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', { method: 'POST' });
                if (response.ok) {
                    window.location.href = '/login';
                }
            } catch (err) {
                console.error('Log out failed:', err);
            }
        });
    }

    // 12. Handle Resume Trip Click
    const resumeTripBtn = document.getElementById('resume-trip-btn');
    if (resumeTripBtn) {
        resumeTripBtn.addEventListener('click', async () => {
            if (!lastEndedTrip) return;

            resumeTripBtn.disabled = true;
            resumeTripBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Resuming...';

            try {
                const response = await fetch('/api/trips/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bus_id: lastEndedTrip.bus_id,
                        route_id: lastEndedTrip.route_id,
                        departure_time: lastEndedTrip.departure_time,
                        start_stop_id: lastEndedTrip.current_stop_id
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Refresh and load details
                    await checkActiveTrip();
                } else {
                    alert(data.error || 'Failed to resume trip.');
                }
            } catch (err) {
                console.error('Error resuming trip:', err);
                alert('An error occurred.');
            } finally {
                resumeTripBtn.disabled = false;
                resumeTripBtn.innerHTML = '<i class="fa-solid fa-arrow-rotate-left"></i> Resume Trip';
            }
        });
    }
});

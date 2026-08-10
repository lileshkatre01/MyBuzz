document.addEventListener('DOMContentLoaded', () => {
    // Theme logic removed - always dark theme

    // Custom Confirmation Dialog (OK / Cancel)
    function showCustomConfirm(message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'custom-confirm-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100vw';
            overlay.style.height = '100vh';
            overlay.style.backgroundColor = 'rgba(15, 9, 7, 0.5)';
            overlay.style.backdropFilter = 'blur(8px)';
            overlay.style.webkitBackdropFilter = 'blur(8px)';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '9999';
            overlay.style.animation = 'fadeIn 0.2s ease-out';

            const card = document.createElement('div');
            card.className = 'custom-confirm-card';
            card.style.backgroundColor = 'var(--white)';
            card.style.borderRadius = '20px';
            card.style.padding = '32px 28px';
            card.style.width = '90%';
            card.style.maxWidth = '380px';
            card.style.border = '1px solid var(--border-light)';
            card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.2)';
            card.style.textAlign = 'center';
            card.style.animation = 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';

            const iconContainer = document.createElement('div');
            iconContainer.style.width = '64px';
            iconContainer.style.height = '64px';
            iconContainer.style.borderRadius = '50%';
            iconContainer.style.backgroundColor = 'var(--bg-light)';
            iconContainer.style.color = 'var(--primary-blue)';
            iconContainer.style.fontSize = '1.8rem';
            iconContainer.style.display = 'inline-flex';
            iconContainer.style.alignItems = 'center';
            iconContainer.style.justifyContent = 'center';
            iconContainer.style.marginBottom = '20px';
            iconContainer.style.transition = 'transform 0.3s ease';

            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-triangle-exclamation';
            iconContainer.appendChild(icon);
            card.appendChild(iconContainer);

            const text = document.createElement('p');
            text.innerText = message;
            text.style.fontSize = '1.1rem';
            text.style.fontWeight = '600';
            text.style.color = 'var(--text-dark)';
            text.style.lineHeight = '1.5';
            text.style.marginBottom = '28px';
            card.appendChild(text);

            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '14px';
            btnContainer.style.justifyContent = 'center';

            const cancelBtn = document.createElement('button');
            cancelBtn.innerText = 'Cancel';
            cancelBtn.style.padding = '12px 24px';
            cancelBtn.style.borderRadius = '12px';
            cancelBtn.style.border = '1px solid var(--border-light)';
            cancelBtn.style.backgroundColor = 'var(--bg-light)';
            cancelBtn.style.color = 'var(--text-muted)';
            cancelBtn.style.fontWeight = '700';
            cancelBtn.style.fontSize = '0.95rem';
            cancelBtn.style.cursor = 'pointer';
            cancelBtn.style.transition = 'var(--transition-smooth)';
            cancelBtn.style.flex = '1';
            cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.backgroundColor = 'var(--border-light)';
                cancelBtn.style.transform = 'translateY(-1px)';
            });
            cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.backgroundColor = 'var(--bg-light)';
                cancelBtn.style.transform = 'none';
            });

            const confirmBtn = document.createElement('button');
            confirmBtn.innerText = 'OK';
            confirmBtn.style.padding = '12px 24px';
            confirmBtn.style.borderRadius = '12px';
            confirmBtn.style.border = 'none';
            confirmBtn.style.backgroundColor = 'var(--primary-blue)';
            confirmBtn.style.color = '#ffffff';
            confirmBtn.style.fontWeight = '700';
            confirmBtn.style.fontSize = '0.95rem';
            confirmBtn.style.cursor = 'pointer';
            confirmBtn.style.transition = 'var(--transition-smooth)';
            confirmBtn.style.flex = '1';
            confirmBtn.style.boxShadow = '0 4px 12px rgba(var(--btn-shadow-color), 0.25)';
            confirmBtn.addEventListener('mouseenter', () => {
                confirmBtn.style.filter = 'brightness(1.1)';
                confirmBtn.style.transform = 'translateY(-1px)';
                confirmBtn.style.boxShadow = '0 6px 16px rgba(var(--btn-shadow-color), 0.35)';
            });
            confirmBtn.addEventListener('mouseleave', () => {
                confirmBtn.style.filter = 'none';
                confirmBtn.style.transform = 'none';
                confirmBtn.style.boxShadow = '0 4px 12px rgba(var(--btn-shadow-color), 0.25)';
            });

            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(true);
            });

            btnContainer.appendChild(cancelBtn);
            btnContainer.appendChild(confirmBtn);
            card.appendChild(btnContainer);
            overlay.appendChild(card);
            document.body.appendChild(overlay);
        });
    }

    // State Variables
    let currentUser = null;
    let activeTrip = null;
    let routeStops = [];
    let tripLogs = [];
    let lastEndedTrip = null;
    let isTripForceEnded = false;
    let delayPollInterval = null;
    let hasPromptedForCurrentStop = false;

    // Parse SQLite UTC timestamp (YYYY-MM-DD HH:MM:SS) to JS Date (in UTC)
    function parseSqliteUtc(tsStr) {
        if (!tsStr) return null;
        const utcStr = tsStr.replace(' ', 'T') + 'Z';
        return new Date(utcStr);
    }

    // Toast Notification System
    function showToast(message) {
        const toast = document.createElement('div');
        toast.innerText = message;
        toast.style.position = 'fixed';
        toast.style.bottom = '24px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        toast.style.backgroundColor = 'rgba(15, 9, 7, 0.9)';
        toast.style.color = '#ffffff';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '30px';
        toast.style.fontSize = '0.9rem';
        toast.style.fontWeight = '600';
        toast.style.zIndex = '10000';
        toast.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';
        toast.style.opacity = '0';
        toast.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';
        
        document.body.appendChild(toast);
        
        // Trigger reflow
        toast.offsetHeight;
        
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
        
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            toast.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

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

        // Find Current Stop & Status
        const currentStopId = activeTrip.current_stop_id;
        const currentStatus = activeTrip.current_status;
        const currentStop = routeStops.find(s => s.id === currentStopId);

        // Re-enable force end trip button since a journey is active/resumed
        if (endTripBtn) {
            endTripBtn.disabled = false;
            endTripBtn.className = 'btn btn-danger';
            endTripBtn.innerHTML = '<i class="fa-solid fa-circle-stop"></i> <span>Force End Trip</span>';
            isTripForceEnded = false;
        }

        // Enable timeline checkins
        if (driverTimeline) {
            driverTimeline.classList.remove('trip-inactive');
        }

        activeRouteName.innerHTML = `${activeTrip.source} &rarr; ${activeTrip.destination}`;
        activeBusDetails.innerHTML = `<i class="fa-solid fa-bus"></i> Bus: ${activeTrip.bus_number} (${activeTrip.bus_type}) | Scheduled: ${activeTrip.departure_time}`;

        // Clear any existing delay polling interval
        if (delayPollInterval) {
            clearInterval(delayPollInterval);
            delayPollInterval = null;
        }

        // If the bus is at a stop, start monitoring for delay
        if (currentStatus === 'reached' && !isTripForceEnded) {
            // Reset prompted flag since it's a new reached state
            hasPromptedForCurrentStop = false;

            delayPollInterval = setInterval(async () => {
                if (!activeTrip || activeTrip.current_status !== 'reached' || isTripForceEnded || hasPromptedForCurrentStop) {
                    return;
                }

                const reachedTime = parseSqliteUtc(activeTrip.last_updated);
                if (!reachedTime) return;

                const elapsedSec = (new Date() - reachedTime) / 1000;
                if (elapsedSec > 15) { // 15 seconds threshold for demo purposes
                    hasPromptedForCurrentStop = true;
                    
                    const confirmed = await showCustomConfirm(
                        'Are you stuck in traffic? Nagpur ↔ Gondia commuters are waiting. Let us report a traffic delay.'
                    );
                    
                    if (confirmed) {
                        try {
                            const res = await fetch('/api/trips/report-delay', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    trip_id: activeTrip.id,
                                    delay_minutes: 10
                                })
                            });
                            const data = await res.json();
                            if (res.ok && data.success) {
                                showToast('Traffic delay of 10 mins reported.');
                                // Reload active trip status to update state
                                await loadActiveTripDetails(activeTrip.id);
                            } else {
                                console.error('Failed to report delay:', data.error);
                            }
                        } catch (err) {
                            console.error('Error reporting delay:', err);
                        }
                    }
                }
            }, 5000);
        }
        
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

    // 10. Handle End Trip / Resume Trip Toggle
    if (endTripBtn) {
        endTripBtn.addEventListener('click', async () => {
            if (!activeTrip) return;

            if (!isTripForceEnded) {
                // Click to FORCE END
                const confirmed = await showCustomConfirm('Do you want to force end the trip?');
                if (!confirmed) return;

                endTripBtn.disabled = true;
                endTripBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> <span>Ending...</span>';

                try {
                    const response = await fetch('/api/trips/end', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ trip_id: activeTrip.id })
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        lastEndedTrip = {
                            bus_id: activeTrip.bus_id,
                            route_id: activeTrip.route_id,
                            departure_time: activeTrip.departure_time,
                            current_stop_id: activeTrip.current_stop_id
                        };
                        isTripForceEnded = true;

                        showToast('Trip stopped forcefully.');

                        // Toggle button class and HTML
                        endTripBtn.className = 'btn btn-warning';
                        endTripBtn.innerHTML = '<i class="fa-solid fa-arrow-rotate-left"></i> <span>Resume Trip</span>';
                        
                        // Disable checkpoint timeline interactions
                        if (driverTimeline) {
                            driverTimeline.classList.add('trip-inactive');
                        }
                    } else {
                        alert(data.error || 'Failed to end trip.');
                    }
                } catch (err) {
                    console.error('Error ending trip:', err);
                    alert('An error occurred.');
                } finally {
                    endTripBtn.disabled = false;
                }
            } else {
                // Click to RESUME
                const confirmed = await showCustomConfirm('Are you sure you want to resume the trip?');
                if (!confirmed) return;

                endTripBtn.disabled = true;
                endTripBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> <span>Resuming...</span>';

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
                        isTripForceEnded = false;
                        showToast('Trip resumed successfully.');
                        await checkActiveTrip();
                    } else {
                        alert(data.error || 'Failed to resume trip.');
                        endTripBtn.disabled = false;
                    }
                } catch (err) {
                    console.error('Error resuming trip:', err);
                    alert('An error occurred.');
                    endTripBtn.disabled = false;
                }
            }
        });
    }

    // 11. Handle Log out
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('Are you sure you want to log out?');
            if (!confirmed) return;
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

});

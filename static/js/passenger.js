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

    // Current State
    let activeRouteId = 1; // 1: Nagpur -> Gondia, 2: Gondia -> Nagpur
    let activeTripId = null;
    let pollInterval = null;

    // Navigation Screens Map
    const screens = {
        'home': document.getElementById('screen-home'),
        'timetable': document.getElementById('screen-timetable'),
        'alerts': document.getElementById('screen-alerts'),
        'profile': document.getElementById('screen-profile'),
        'search-results': document.getElementById('screen-search-results'),
        'live-tracking': document.getElementById('screen-live-tracking'),
        'route-stops': document.getElementById('screen-route-stops')
    };

    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const backButtons = document.querySelectorAll('.app-screen .back-btn');
    
    // Home controls
    const fromStopInput = document.getElementById('from-stop');
    const toStopInput = document.getElementById('to-stop');
    const swapRouteBtn = document.getElementById('swap-route-btn');
    const searchBusesBtn = document.getElementById('search-buses-btn');
    const lastSearchTrigger = document.getElementById('last-search-trigger');
    const lastSearchText = document.getElementById('last-search-text');
    
    // Quick Access Grid
    const quickLive = document.getElementById('quick-live');
    const quickSchedule = document.getElementById('quick-schedule');
    const quickFare = document.getElementById('quick-fare');
    const quickStops = document.getElementById('quick-stops');

    // Search Results page
    const resultsRouteTitle = document.getElementById('results-route-title');
    const resultsList = document.getElementById('results-list');
    const activeBusesInfo = document.getElementById('active-buses-info');

    // Live Tracking page
    const liveBusNum = document.getElementById('live-bus-num');
    const liveBusType = document.getElementById('live-bus-type');
    const liveBusRoute = document.getElementById('live-bus-route');
    const liveBusTimes = document.getElementById('live-bus-times');
    const mapTimelineStops = document.getElementById('map-timeline-stops');
    const trackingRefreshBtn = document.getElementById('tracking-refresh-btn');
    
    // Tracking HUD details
    const hudNextStopName = document.getElementById('hud-next-stop-name');
    const hudEtaVal = document.getElementById('hud-eta-val');
    const hudDistVal = document.getElementById('hud-dist-val');
    const hudTimeVal = document.getElementById('hud-time-val');
    const hudProgressFillBar = document.getElementById('hud-progress-fill-bar');
    const hudDotNext = document.getElementById('hud-dot-next');

    // Timetable page
    const timetableRouteLabel = document.getElementById('timetable-route-label');
    const timetableScreenList = document.getElementById('timetable-screen-list');

    // Stops page
    const routeStopsLabel = document.getElementById('route-stops-label');
    const routeStopsTimeline = document.getElementById('route-stops-timeline');

    // Logout
    const profileLogoutBtn = document.getElementById('profile-logout-btn');

    // Initialize
    initApp();

    function initApp() {
        setupNav();
        setupHomeActions();
        setupBackActions();
        setupAnalyticsToggle();
        
        // Auto-fetch static updates
        fetchTimetable();
        fetchRouteStops();
    }

    function setupAnalyticsToggle() {
        const toggleBtn = document.getElementById('toggle-analytics-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const container = toggleBtn.closest('.delay-analysis-container');
                if (container) {
                    container.classList.toggle('collapsed');
                }
            });
        }
    }

    // 1. Navigation Controller
    function setupNav() {
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetScreen = item.dataset.screen;
                
                // Clear any detail view tracking loops
                clearInterval(pollInterval);
                
                // Reset and sync all nav items targeting the same screen
                navItems.forEach(n => n.classList.remove('active'));
                document.querySelectorAll(`.nav-item[data-screen="${targetScreen}"]`).forEach(n => {
                    n.classList.add('active');
                });

                // Switch screens
                switchScreen(targetScreen);

                // Fetch data updates
                if (targetScreen === 'timetable') {
                    fetchTimetable();
                }
            });
        });
    }

    function switchScreen(screenKey) {
        Object.keys(screens).forEach(key => {
            if (screens[key]) {
                screens[key].classList.remove('active');
            }
        });
        if (screens[screenKey]) {
            screens[screenKey].classList.add('active');
        }
        
        // Auto-synchronize navigation highlights when switching screens programmatically
        navItems.forEach(n => n.classList.remove('active'));
        document.querySelectorAll(`.nav-item[data-screen="${screenKey}"]`).forEach(n => {
            n.classList.add('active');
        });
    }

    // 2. Setup Back Buttons
    function setupBackActions() {
        backButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                clearInterval(pollInterval);
                
                // Smart go-back logic
                const currentScreen = btn.closest('.app-screen');
                if (currentScreen.id === 'screen-search-results') {
                    switchScreen('home');
                } else if (currentScreen.id === 'screen-live-tracking') {
                    switchScreen('search-results');
                    // Resume list updates
                    fetchSearchResults();
                    pollInterval = setInterval(fetchSearchResults, 10000);
                } else if (currentScreen.id === 'screen-route-stops') {
                    switchScreen('home');
                } else {
                    switchScreen('home');
                }
            });
        });
    }

    // 3. Home Screen Controllers
    function setupHomeActions() {
        // Swap inputs
        if (swapRouteBtn) {
            swapRouteBtn.addEventListener('click', () => {
                const fromVal = fromStopInput.value;
                const toVal = toStopInput.value;
                
                fromStopInput.value = toVal;
                toStopInput.value = fromVal;
                
                // Update Route ID
                activeRouteId = activeRouteId === 1 ? 2 : 1;
                
                const fromSub = fromStopInput.nextElementSibling;
                const toSub = toStopInput.nextElementSibling;
                const tempSub = fromSub.textContent;
                fromSub.textContent = toSub.textContent;
                toSub.textContent = tempSub;
                
                if (lastSearchText) {
                    lastSearchText.innerHTML = `${toVal} &rarr; ${fromVal}`;
                }
            });
        }

        // Trigger Search
        if (searchBusesBtn) {
            searchBusesBtn.addEventListener('click', () => {
                triggerBusSearch();
            });
        }

        if (lastSearchTrigger) {
            lastSearchTrigger.addEventListener('click', () => {
                triggerBusSearch();
            });
        }

        // Quick Access items
        if (quickLive) {
            quickLive.addEventListener('click', () => {
                triggerBusSearch();
            });
        }
        if (quickSchedule) {
            quickSchedule.addEventListener('click', () => {
                // Switch to timetable
                document.querySelector('[data-screen="timetable"]').click();
            });
        }
        if (quickFare) {
            quickFare.addEventListener('click', () => {
                document.querySelector('[data-screen="timetable"]').click();
            });
        }
        if (quickStops) {
            quickStops.addEventListener('click', () => {
                fetchRouteStops();
                switchScreen('route-stops');
            });
        }
    }

    function triggerBusSearch() {
        switchScreen('search-results');
        
        // Update Search Page Header
        const dirText = activeRouteId === 1 ? 'Nagpur ↔ Gondia' : 'Gondia ↔ Nagpur';
        if (resultsRouteTitle) resultsRouteTitle.textContent = dirText;

        fetchSearchResults();
        clearInterval(pollInterval);
        pollInterval = setInterval(fetchSearchResults, 10000);
    }

    // 4. Fetch Search Results
    async function fetchSearchResults() {
        try {
            // Fetch running active trips on this route
            const activeRes = await fetch(`/api/trips/active?route_id=${activeRouteId}`);
            const activeTrips = await activeRes.json();

            // Fetch scheduled timetable
            const scheduleRes = await fetch('/api/timetable');
            const schedules = await scheduleRes.json();
            const routeSchedules = schedules[activeRouteId.toString()] || [];

            renderSearchResults(activeTrips, routeSchedules);

        } catch (err) {
            console.error('Error fetching search results:', err);
        }
    }

    // 5. Render Search Results
    function renderSearchResults(activeTrips, routeSchedules) {
        if (!resultsList) return;
        resultsList.innerHTML = '';

        if (activeBusesInfo) {
            activeBusesInfo.textContent = `Live Running Buses: ${activeTrips.length}`;
        }

        // Loop and render buses
        // To match Screen 2 layout, we render the buses based on schedule list, but merge any active running status onto them!
        routeSchedules.forEach((sched) => {
            // Check if there is an active running trip matching this scheduled time
            const activeRun = activeTrips.find(t => t.departure_time === sched.time);
            
            const card = document.createElement('div');
            card.className = 'bus-search-card card';
            
            let badgeClass = sched.type.includes('Shivshahi') ? 'badge-shivshahi' : 'badge-ordinary';
            let liveTag = '';
            let seatBadge = '';
            
            if (activeRun) {
                liveTag = `
                    <div class="card-live-indicator">
                        <i class="fa-solid fa-circle animate-pulse" style="font-size: 5px;"></i>
                        <span>LIVE</span>
                    </div>
                `;
                
                const status = activeRun.seat_status || 'seats_available';
                if (status === 'seats_available') {
                    seatBadge = `<span class="badge-seat badge-seat-green"><i class="fa-solid fa-chair"></i> Seats Available</span>`;
                } else if (status === 'standing_only') {
                    seatBadge = `<span class="badge-seat badge-seat-yellow"><i class="fa-solid fa-users"></i> Standing Only</span>`;
                } else if (status === 'full') {
                    seatBadge = `<span class="badge-seat badge-seat-red"><i class="fa-solid fa-circle-xmark"></i> Bus Full</span>`;
                }
            }

            card.innerHTML = `
                ${liveTag}
                <div class="bus-time-row">
                    <div class="bus-time-node">
                        <span class="time">${sched.time}</span>
                        <span class="station">${activeRouteId === 1 ? 'Nagpur (MBS)' : 'Gondia (BS)'}</span>
                    </div>
                    
                    <div class="bus-duration-line">
                        <span class="duration">${sched.duration}</span>
                        <div class="line-art"></div>
                        <span class="direct-label">Direct</span>
                    </div>

                    <div class="bus-time-node" style="text-align: right;">
                        <span class="time">${sched.eta}</span>
                        <span class="station">${activeRouteId === 1 ? 'Gondia (BS)' : 'Nagpur (MBS)'}</span>
                    </div>
                </div>

                <div class="bus-bottom-meta-row">
                    <div class="bus-type-badge-col" style="display: flex; gap: 8px; align-items: center;">
                        <span class="${badgeClass}">${sched.type}</span>
                        ${seatBadge}
                    </div>
                    <div class="bus-fare-col">
                        <i class="fa-regular fa-bookmark bookmark-icon"></i>
                    </div>
                </div>
            `;

            // If it is active/live, make it clickable to live tracking!
            if (activeRun) {
                card.addEventListener('click', () => {
                    activeTripId = activeRun.id;
                    switchScreen('live-tracking');
                    
                    clearInterval(pollInterval);
                    fetchLiveTrackingStatus();
                    pollInterval = setInterval(fetchLiveTrackingStatus, 10000);
                });
            } else {
                // Clicking inactive schedules goes to static Stops screen (Screen 5)
                card.addEventListener('click', () => {
                    fetchRouteStops();
                    switchScreen('route-stops');
                });
            }

            // Bookmark event listener safety
            const bmark = card.querySelector('.bookmark-icon');
            if (bmark) {
                bmark.addEventListener('click', (e) => {
                    e.stopPropagation();
                    bmark.classList.toggle('fa-regular');
                    bmark.classList.toggle('fa-solid');
                    bmark.classList.toggle('active');
                });
            }

            resultsList.appendChild(card);
        });
    }

    // 6. Fetch Live Tracking details
    async function fetchLiveTrackingStatus() {
        if (!activeTripId) return;

        try {
            const response = await fetch(`/api/trips/${activeTripId}/status`);
            if (response.status === 404) {
                alert('Trip has been completed or ended by driver.');
                screens['live-tracking'].querySelector('.back-btn').click();
                return;
            }
            
            const data = await response.json();
            renderLiveTracking(data);
            fetchAndRenderDelayAnalysis(); // Fetch and render delay and dwell time analysis

        } catch (err) {
            console.error('Error fetching live tracking status:', err);
        }
    }

    // 6b. Fetch and render ML delay prediction analysis
    async function fetchAndRenderDelayAnalysis() {
        if (!activeTripId) return;
        try {
            const response = await fetch(`/api/trips/${activeTripId}/delay-analysis`);
            const data = await response.json();
            if (data && data.analysis) {
                renderDelayAnalysis(data.analysis);
            }
        } catch (err) {
            console.error('Error fetching delay analysis:', err);
        }
    }

    // 6c. Render vertical bar graph for dwell time & travel time
    function renderDelayAnalysis(analysis) {
        const barsContainer = document.getElementById('vertical-chart-bars');
        const yAxisContainer = document.getElementById('chart-y-axis');
        if (!barsContainer || !yAxisContainer) return;
        
        barsContainer.innerHTML = '';
        
        if (!analysis || analysis.length === 0) {
            barsContainer.innerHTML = `
                <div style="font-size: 0.75rem; text-align: center; color: #64748b; width: 100%; padding-bottom: 20px;">
                    <i class="fa-solid fa-hourglass-start animate-spin" style="margin-right: 4px;"></i>
                    Waiting for bus to start from origin...
                </div>
            `;
            return;
        }
        
        // Find max value to scale the chart bars dynamically
        let maxVal = 10.0;
        analysis.forEach(item => {
            if (item.dwell_min > maxVal) maxVal = item.dwell_min;
            if (item.travel_min > maxVal) maxVal = item.travel_min;
        });
        
        // Round maxVal up to the nearest multiple of 5 for a clean Y-Axis
        maxVal = Math.ceil(maxVal / 5) * 5;
        
        // Update Y-Axis labels
        yAxisContainer.innerHTML = `
            <span>${maxVal}m</span>
            <span>${Math.round(maxVal * 0.75)}m</span>
            <span>${Math.round(maxVal * 0.5)}m</span>
            <span>${Math.round(maxVal * 0.25)}m</span>
            <span>0m</span>
        `;
        
        analysis.forEach(item => {
            const dwellPercent = (item.dwell_min / maxVal) * 100;
            const travelPercent = (item.travel_min / maxVal) * 100;
            
            const column = document.createElement('div');
            column.className = 'chart-column';
            
            // Build the travel bar if it's not the origin stop
            let travelBarHtml = '';
            if (item.stop_order > 0) {
                travelBarHtml = `
                    <div class="vertical-bar travel-bar" 
                         style="height: ${travelPercent}%;" 
                         data-value="Travel: ${item.travel_min}m (Est: ${item.est_travel_min}m)">
                    </div>
                `;
            }
            
            column.innerHTML = `
                <div class="column-bars">
                    <div class="vertical-bar dwell-bar" 
                         style="height: ${dwellPercent}%;" 
                         data-value="Dwell: ${item.dwell_min}m">
                    </div>
                    ${travelBarHtml}
                </div>
                <div class="column-label" title="${item.stop_name}">${item.stop_name}</div>
            `;
            
            barsContainer.appendChild(column);
        });
    }

    // Helper to format SQLite timestamp (HH:MM AM/PM)
    function formatTime(timestampStr) {
        if (!timestampStr) return '-';
        try {
            const parts = timestampStr.split(' ');
            if (parts.length > 1) {
                const timeParts = parts[1].split(':');
                let hours = parseInt(timeParts[0]);
                const minutes = timeParts[1];
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12;
                hours = hours ? hours : 12;
                return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
            }
        } catch (e) {}
        return timestampStr;
    }

    // 7. Render Live Tracking page (Screen 3 layout)
    function renderLiveTracking(data) {
        const trip = data.trip;
        const stops = data.stops;
        const logs = data.logs;

        liveBusNum.textContent = `Bus ${trip.bus_number}`;
        liveBusType.textContent = trip.bus_type;
        liveBusType.className = trip.bus_type.includes('Shivshahi') ? 'badge badge-shivshahi' : 'badge badge-ordinary';

        // Update Traffic Delay Alert Banner
        const delayBanner = document.getElementById('tracking-delay-banner');
        const delayText = document.getElementById('tracking-delay-text');
        if (delayBanner && delayText) {
            if (data.bottlenecks && data.bottlenecks.length > 0) {
                const lastB = data.bottlenecks[data.bottlenecks.length - 1];
                delayText.innerHTML = `Traffic Alert: Auto-detected heavy traffic between <strong>${lastB.prev_stop_name}</strong> and <strong>${lastB.curr_stop_name}</strong> (+${lastB.delay_minutes} min delay).`;
                delayBanner.classList.remove('hidden');
            } else if (trip.delay_minutes > 0) {
                delayText.innerHTML = `Traffic Alert: Delay of <strong>${trip.delay_minutes} minutes</strong> reported on this route.`;
                delayBanner.classList.remove('hidden');
            } else {
                delayBanner.classList.add('hidden');
            }
        }
        
        // Update Seat Status Badge on HUD
        const seatStatusEl = document.getElementById('live-seat-status');
        if (seatStatusEl) {
            const status = trip.seat_status || 'seats_available';
            seatStatusEl.className = 'badge-seat'; // reset
            if (status === 'seats_available') {
                seatStatusEl.innerHTML = `<i class="fa-solid fa-chair"></i> Seats Available`;
                seatStatusEl.classList.add('badge-seat-green');
            } else if (status === 'standing_only') {
                seatStatusEl.innerHTML = `<i class="fa-solid fa-users"></i> Standing Only`;
                seatStatusEl.classList.add('badge-seat-yellow');
            } else if (status === 'full') {
                seatStatusEl.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Bus Full`;
                seatStatusEl.classList.add('badge-seat-red');
            }
        }

        liveBusRoute.innerHTML = `${trip.source} &rarr; ${trip.destination}`;
        liveBusTimes.textContent = `${trip.departure_time} - 10:00 AM`; // approximate end time

        // Calculate passed indices
        const currentStopId = trip.current_stop_id;
        const currentStatus = trip.current_status;
        const currentStop = stops.find(s => s.id === currentStopId);

        // Find next upcoming stop
        let nextStop = null;
        if (currentStop) {
            if (currentStatus === 'reached') {
                nextStop = currentStop;
            } else if (currentStatus === 'left') {
                nextStop = stops.find(s => s.stop_order === currentStop.stop_order + 1);
            }
        }
        if (!nextStop) nextStop = stops[stops.length - 1]; // Fallback to final stop

        // Map layout logic
        mapTimelineStops.innerHTML = '';
        
        // Calculate bus visual position on the screen map
        // Since stops are drawn vertically, we can compute height offsets
        // Each stop takes standard container offset:
        const totalStops = stops.length;
        
        stops.forEach((stop, index) => {
            let nodeClass = 'map-stop-node';
            if (index === 0) nodeClass += ' start-point';
            else if (index === totalStops - 1) nodeClass += ' end-point';

            const stopLogs = logs.filter(l => l.stop_id === stop.id);
            const reached = stopLogs.some(l => l.status === 'reached');

            if (reached) {
                nodeClass += ' reached-node';
            }

            // Check if next stop has been reached
            let segmentHtml = '';
            if (index < totalStops - 1) {
                const nextStopObj = stops[index + 1];
                const nextStopLogs = logs.filter(l => l.stop_id === nextStopObj.id);
                const nextReached = nextStopLogs.some(l => l.status === 'reached');
                const isBottleneck = data.bottlenecks && data.bottlenecks.some(b => b.stop_id === nextStopObj.id);
                
                let segmentClass = 'map-segment-line';
                if (nextReached) segmentClass += ' reached';
                if (isBottleneck) segmentClass += ' bottleneck';
                segmentHtml = `<div class="${segmentClass}"></div>`;
            }

            // Check if current stop is bottlenecked (has dynamic traffic delay)
            const segmentBottleneck = data.bottlenecks && data.bottlenecks.find(b => b.stop_id === stop.id);
            let delayTagHtml = '';
            if (segmentBottleneck) {
                delayTagHtml = `<span class="timeline-delay-tag" style="margin-left: 8px; font-size: 0.7rem; color: #ea580c; font-weight: 800; background: rgba(234,88,12,0.1); padding: 2px 6px; border-radius: 8px; border: 1px solid rgba(234,88,12,0.2);"><i class="fa-solid fa-triangle-exclamation"></i> Heavy Traffic (+${segmentBottleneck.delay_minutes}m)</span>`;
            }

            const li = document.createElement('li');
            li.className = nodeClass;
            li.innerHTML = `
                <div class="map-dot"></div>
                <span class="stop-name" style="display: inline-flex; align-items: center;">${stop.stop_name}${delayTagHtml}</span>
                ${segmentHtml}
            `;

            // Draw the actual Live Bus indicator on the map container
            // If the bus is at this stop (reached), render it directly on the node
            if (currentStop && stop.id === currentStop.id && currentStatus === 'reached') {
                li.innerHTML += `
                    <div class="map-live-bus">
                        <i class="fa-solid fa-bus animate-pulse"></i>
                        <span class="live-tag">Live</span>
                    </div>
                `;
            }
            
            // If the bus has left this stop (in-transit), render it halfway between this stop and the next!
            if (currentStop && stop.id === currentStop.id && currentStatus === 'left') {
                li.innerHTML += `
                    <div class="map-live-bus" style="top: calc(50% + 37px); z-index: 100;">
                        <i class="fa-solid fa-bus animate-pulse"></i>
                        <span class="live-tag">Live</span>
                    </div>
                `;
            }

            mapTimelineStops.appendChild(li);
        });

        // Set Next Stop HUD Metrics
        hudNextStopName.textContent = nextStop.stop_name;
        
        if (currentStatus === 'reached' && currentStop.id === nextStop.id) {
            hudEtaVal.textContent = formatTime(logs[logs.length - 1].timestamp);
            hudDistVal.textContent = '0 km';
            hudTimeVal.textContent = 'Arrived';
            hudProgressFillBar.style.width = `${(currentStop.stop_order / (totalStops - 1)) * 100}%`;
            hudDotNext.className = 'hud-progress-dot reached';
        } else {
            // Estimates (e.g. 20 min / 25 km approx)
            hudEtaVal.textContent = '09:05 AM'; // static ETA mock as in design screenshot
            hudDistVal.textContent = '25 km';
            hudTimeVal.textContent = '20 min';
            
            // Compute percentage
            const baseOrder = currentStop ? currentStop.stop_order : 0;
            const percentage = ((baseOrder + 0.5) / (totalStops - 1)) * 100;
            hudProgressFillBar.style.width = `${percentage}%`;
            hudDotNext.className = 'hud-progress-dot active';
        }
    }

    if (trackingRefreshBtn) {
        trackingRefreshBtn.addEventListener('click', () => {
            fetchLiveTrackingStatus();
        });
    }

    // 8. Timetable Screen (Screen 4)
    async function fetchTimetable() {
        try {
            const response = await fetch('/api/timetable');
            const data = await response.json();
            const list = data[activeRouteId.toString()] || [];

            if (timetableRouteLabel) {
                timetableRouteLabel.innerHTML = activeRouteId === 1 ? 'Nagpur &rarr; Gondia' : 'Gondia &rarr; Nagpur';
            }

            renderTimetableList(list);

        } catch (err) {
            console.error('Error loading timetable:', err);
        }
    }

    function renderTimetableList(list) {
        if (!timetableScreenList) return;
        timetableScreenList.innerHTML = '';

        list.forEach(row => {
            timetableScreenList.innerHTML += `
                <div class="timetable-row-item">
                    <div class="timetable-time-box">
                        <i class="fa-regular fa-clock"></i>
                        <span class="time">${row.time}</span>
                    </div>
                    <div class="timetable-type-box">
                        <span class="type">${row.type}</span>
                        <div class="duration">${row.duration}</div>
                    </div>
                    <div class="timetable-fare-box">
                        <div class="tag">On Board</div>
                    </div>
                </div>
            `;
        });
    }

    // 9. Route & Stops Screen (Screen 5)
    async function fetchRouteStops() {
        try {
            const response = await fetch(`/api/stops/${activeRouteId}`);
            const stops = await response.json();

            if (routeStopsLabel) {
                routeStopsLabel.innerHTML = activeRouteId === 1 ? 'Nagpur &rarr; Gondia' : 'Gondia &rarr; Nagpur';
            }

            renderRouteStopsTimeline(stops);

        } catch (err) {
            console.error('Error fetching stops timeline:', err);
        }
    }

    function renderRouteStopsTimeline(stops) {
        if (!routeStopsTimeline) return;
        routeStopsTimeline.innerHTML = '';

        const len = stops.length;
        // Map rough time increments for static showcase
        let currentMinutes = 0;
        
        stops.forEach((stop, index) => {
            let itemClass = 'stops-timeline-item';
            if (index === 0) itemClass += ' start-stop';
            else if (index === len - 1) itemClass += ' end-stop';

            // Generate increment times from 06:30 AM
            if (index > 0) {
                currentMinutes += stop.estimated_duration_min;
            }
            
            // Format mock timings starting at 06:30 AM
            let hour = 6 + Math.floor((30 + currentMinutes) / 60);
            let mins = (30 + currentMinutes) % 60;
            let ampm = hour >= 12 ? 'PM' : 'AM';
            hour = hour % 12;
            hour = hour ? hour : 12;
            const timeStr = `${hour.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${ampm}`;

            routeStopsTimeline.innerHTML += `
                <li class="${itemClass}">
                    <div class="node-dot"></div>
                    <span class="stop-time">${timeStr}</span>
                    <div class="stop-name-desc">
                        <span class="stop-title">${stop.stop_name}</span>
                        <span class="stop-desc">${index === 0 ? 'Starting Point' : (index === len - 1 ? 'End Point' : 'Checkpoint')}</span>
                    </div>
                </li>
            `;
        });
    }

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

    // 10. Handle Passenger Log out
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('Are you sure you want to log out?');
            if (!confirmed) return;
            try {
                const response = await fetch('/api/logout', { method: 'POST' });
                if (response.ok) {
                    window.location.href = '/login?role=passenger';
                }
            } catch (err) {
                console.error('Log out failed:', err);
            }
        });
    }
});

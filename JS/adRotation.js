// Configuration
const CONFIG_FILE = '/adsConfiguration.json'; // Path to your JSON config file
const ROTATION_INTERVAL = 20000; // 30 seconds in milliseconds
const TIMEZONE = 'America/Los_Angeles'; // PST/PDT timezone

class AdRotationSystem {
  constructor(configFile, rotationInterval, timezone) {
    this.configFile = configFile;
    this.rotationInterval = rotationInterval;
    this.timezone = timezone;
    this.bulletinPosts = document.querySelectorAll('.bulletinpost');
    this.currentIndex = 0; // Single index for synchronized rotation
    this.hasInitializedRotation = false; // Track if we've randomized the starting position
    this.priorityAdCount = 0; // Track how many priority ads (non-default) we have
    this.displayedAds = new Set(); // Track which ads are currently displayed
    this.availableAds = [];
    this.config = null;
    this.rotationTimer = null;
    
    this.init();
  }
  
  async init() {
    await this.loadConfig();
    if (this.config) {
      this.updateAvailableAds();
      this.displayAds();
      this.startRotation();
    }
  }
  
  async loadConfig() {
    try {
      const response = await fetch(this.configFile);
      this.config = await response.json();
    } catch (error) {
      console.error('Failed to load config file:', error);
      // Fallback to showing current images if config fails
    }
  }
  
  getCurrentDay() {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: this.timezone })).getDay();
  }
  
  getCurrentHour() {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: this.timezone })).getHours();
  }
  
  getCurrentMinute() {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: this.timezone })).getMinutes();
  }
  
  checkTimeMatch(schedule) {
    const now = new Date();
    const pstTime = new Date(now.toLocaleString('en-US', { timeZone: this.timezone }));
    const currentDay = pstTime.getDay();
    const currentHour = pstTime.getHours();
    const currentMinute = pstTime.getMinutes();
    
    // Check if day matches (if specified)
    if (schedule.day !== undefined && schedule.day !== currentDay) {
      return false;
    }
    
    // Check if days array matches (if specified)
    if (schedule.days && !schedule.days.includes(currentDay)) {
      return false;
    }
    
    // Check time
    if (schedule.time) {
      const [targetHour, targetMinute] = schedule.time.split(':').map(Number);
      
      // Check if we're within the time window (default 30 min window if not specified)
      const windowMinutes = schedule.windowMinutes || 30;
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      const targetTotalMinutes = targetHour * 60 + targetMinute;
      
      return Math.abs(currentTotalMinutes - targetTotalMinutes) < windowMinutes;
    }
    
    // Check time range
    if (schedule.timeRange) {
      const [start, end] = schedule.timeRange.split('-');
      const [startHour, startMin = 0] = start.split(':').map(Number);
      const [endHour, endMin = 0] = end.split(':').map(Number);
      
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      const startTotalMinutes = startHour * 60 + startMin;
      const endTotalMinutes = endHour * 60 + endMin;
      
      return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
    }
    
    return false;
  }
  
  updateAvailableAds() {
    this.availableAds = [];
    this.priorityAdCount = 0;
    
    if (!this.config || !this.config.ads) return;
    
    const priorityAds = [];
    const defaultAds = [];
    
    // Priority 1: Overwrite ads (always show if present)
    if (this.config.ads.overwrite && this.config.ads.overwrite.length > 0) {
      this.availableAds = [...this.config.ads.overwrite];
      this.priorityAdCount = this.availableAds.length;
      return;
    }
    
    // Priority 2: Specific time schedules (like live broadcasts)
    if (this.config.specificTimeSchedules) {
      for (const schedule of this.config.specificTimeSchedules) {
        if (this.checkTimeMatch(schedule)) {
          const scheduleAds = this.config.ads[schedule.adKey];
          if (scheduleAds && scheduleAds.length > 0) {
            priorityAds.push(...scheduleAds);
          }
        }
      }
    }
    
    // Priority 3: Day-specific ads
    const day = this.getCurrentDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayAds = this.config.ads[dayNames[day]];
    
    if (dayAds && dayAds.length > 0) {
      priorityAds.push(...dayAds);
    }
    
    // Priority 4: General time-based ads (like business hours)
    if (this.config.timeBasedSchedule) {
      const hour = this.getCurrentHour();
      for (const [timeRange, adKey] of Object.entries(this.config.timeBasedSchedule)) {
        const [start, end] = timeRange.split('-').map(Number);
        if (hour >= start && hour <= end) {
          const timeAds = this.config.ads[adKey];
          if (timeAds && timeAds.length > 0) {
            priorityAds.push(...timeAds);
          }
        }
      }
    }
    
    // Priority 5: Default ads (always included)
    if (this.config.ads.defaults && this.config.ads.defaults.length > 0) {
      defaultAds.push(...this.config.ads.defaults);
    }
    
    // Shuffle priority ads if there are any
    if (priorityAds.length > 0) {
      this.shuffleArray(priorityAds);
    }
    
    // Combine: priority ads first, then defaults
    this.availableAds = [...priorityAds, ...defaultAds];
    this.priorityAdCount = priorityAds.length;
    
    // Randomize starting position ONLY on initial load and ONLY for defaults section
    if (!this.hasInitializedRotation) {
      if (this.priorityAdCount > 0) {
        // Start at beginning to show priority ads first
        this.currentIndex = 0;
      } else {
        // No priority ads, randomize within defaults
        this.currentIndex = Math.floor(Math.random() * this.availableAds.length);
      }
      this.hasInitializedRotation = true;
    }
    
    // If no ads available, fallback to defaults
    if (this.availableAds.length === 0 && this.config.ads.defaults) {
      this.availableAds = [...this.config.ads.defaults];
      this.priorityAdCount = 0;
    }
  }
  
  shuffleArray(array) {
    // Fisher-Yates shuffle algorithm
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  getNextAds() {
    if (this.availableAds.length === 0) return [];
    
    const ads = [];
    const numBulletins = this.bulletinPosts.length;
    
    // If we only have 1 ad total, both bulletins show it
    if (this.availableAds.length === 1) {
      for (let i = 0; i < numBulletins; i++) {
        ads.push(this.availableAds[0]);
      }
      return ads;
    }
    
    // Get the next set of ads, ensuring no duplicates
    for (let i = 0; i < numBulletins; i++) {
      const index = (this.currentIndex + i) % this.availableAds.length;
      ads.push(this.availableAds[index]);
    }
    
    // Move the index forward for next rotation
    this.currentIndex = (this.currentIndex + numBulletins) % this.availableAds.length;
    
    return ads;
  }
  
  displayAds() {
    const ads = this.getNextAds();
    
    this.bulletinPosts.forEach((post, index) => {
      const ad = ads[index];
      if (ad) {
        const img = post.querySelector('img');
        const div = post.querySelector('div');
        
        // Check if ad has a link
        if (ad.link) {
          // Wrap in anchor tag if not already wrapped
          let link = post.querySelector('a.bulletin-link');
          if (!link) {
            link = document.createElement('a');
            link.className = 'bulletin-link';
            link.style.cssText = 'display: block; text-decoration: none; color: inherit;';
            
            // Move existing content into the link
            while (post.firstChild) {
              link.appendChild(post.firstChild);
            }
            post.appendChild(link);
          }
          
          link.href = ad.link;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          
          // Update content inside link
          const linkImg = link.querySelector('img');
          const linkDiv = link.querySelector('div');
          
          if (linkImg) {
            linkImg.src = ad.src;
            linkImg.alt = ad.alt;
          }
          if (linkDiv) {
            linkDiv.textContent = ad.caption || ad.alt;
          }
        } else {
          // Remove link wrapper if it exists and ad has no link
          const link = post.querySelector('a.bulletin-link');
          if (link) {
            while (link.firstChild) {
              post.appendChild(link.firstChild);
            }
            link.remove();
          }
          
          // Update content directly
          if (img) {
            img.src = ad.src;
            img.alt = ad.alt;
          }
          if (div) {
            div.textContent = ad.caption || ad.alt;
          }
        }
      }
    });
  }
  
  startRotation() {
    this.rotationTimer = setInterval(() => {
      // Check if we need to update available ads (day/time changed)
      this.updateAvailableAds();
      this.displayAds();
    }, this.rotationInterval);
  }
  
  stop() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
  }
}

// Initialize the ad rotation system when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const adSystem = new AdRotationSystem(CONFIG_FILE, ROTATION_INTERVAL, TIMEZONE);
  
  // Optional: Update ads when visibility changes (user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      adSystem.updateAvailableAds();
      adSystem.displayAds();
    }
  });
});
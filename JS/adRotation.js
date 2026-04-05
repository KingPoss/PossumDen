const CONFIG_FILE = '/adsConfiguration.json';
const ROTATION_INTERVAL = 20000;
const TIMEZONE = 'America/Los_Angeles';

class AdRotationSystem {
  constructor(configFile, rotationInterval, timezone) {
    this.configFile = configFile;
    this.rotationInterval = rotationInterval;
    this.timezone = timezone;
    this.bulletinPosts = document.querySelectorAll('.bulletinpost');
    this.currentIndex = 0;
    this.hasInitializedRotation = false;
    this.priorityAdCount = 0;
    this.displayedAds = new Set();
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
    
    if (schedule.day !== undefined && schedule.day !== currentDay) {
      return false;
    }

    if (schedule.days && !schedule.days.includes(currentDay)) {
      return false;
    }

    if (schedule.time) {
      const [targetHour, targetMinute] = schedule.time.split(':').map(Number);
      const windowMinutes = schedule.windowMinutes || 30;
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      const targetTotalMinutes = targetHour * 60 + targetMinute;
      
      return Math.abs(currentTotalMinutes - targetTotalMinutes) < windowMinutes;
    }
    
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
    
    // overwrite ads always take precedence
    if (this.config.ads.overwrite && this.config.ads.overwrite.length > 0) {
      this.availableAds = [...this.config.ads.overwrite];
      this.priorityAdCount = this.availableAds.length;
      return;
    }
    
    // time-specific stuff (live broadcasts, etc)
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
    
    const day = this.getCurrentDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayAds = this.config.ads[dayNames[day]];
    
    if (dayAds && dayAds.length > 0) {
      priorityAds.push(...dayAds);
    }
    
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
    
    if (this.config.ads.defaults && this.config.ads.defaults.length > 0) {
      defaultAds.push(...this.config.ads.defaults);
    }
    
    if (priorityAds.length > 0) {
      this.shuffleArray(priorityAds);
    }
    
    this.availableAds = [...priorityAds, ...defaultAds];
    this.priorityAdCount = priorityAds.length;

    // randomize starting position on first load
    if (!this.hasInitializedRotation) {
      if (this.priorityAdCount > 0) {
        this.currentIndex = 0;
      } else {
        this.currentIndex = Math.floor(Math.random() * this.availableAds.length);
      }
      this.hasInitializedRotation = true;
    }
    
    if (this.availableAds.length === 0 && this.config.ads.defaults) {
      this.availableAds = [...this.config.ads.defaults];
      this.priorityAdCount = 0;
    }
  }
  
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  getNextAds() {
    if (this.availableAds.length === 0) return [];
    
    const ads = [];
    const numBulletins = this.bulletinPosts.length;
    
    if (this.availableAds.length === 1) {
      for (let i = 0; i < numBulletins; i++) {
        ads.push(this.availableAds[0]);
      }
      return ads;
    }
    
    for (let i = 0; i < numBulletins; i++) {
      const index = (this.currentIndex + i) % this.availableAds.length;
      ads.push(this.availableAds[index]);
    }
    
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
        
        if (ad.link) {
          let link = post.querySelector('a.bulletin-link');
          if (!link) {
            link = document.createElement('a');
            link.className = 'bulletin-link';
            link.style.cssText = 'display: block; text-decoration: none; color: inherit;';
            
            while (post.firstChild) {
              link.appendChild(post.firstChild);
            }
            post.appendChild(link);
          }
          
          link.href = ad.link;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          
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
          const link = post.querySelector('a.bulletin-link');
          if (link) {
            while (link.firstChild) {
              post.appendChild(link.firstChild);
            }
            link.remove();
          }
          
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

document.addEventListener('DOMContentLoaded', () => {
  const adSystem = new AdRotationSystem(CONFIG_FILE, ROTATION_INTERVAL, TIMEZONE);

  // refresh ads when user comes back to the tab
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      adSystem.updateAvailableAds();
      adSystem.displayAds();
    }
  });
});
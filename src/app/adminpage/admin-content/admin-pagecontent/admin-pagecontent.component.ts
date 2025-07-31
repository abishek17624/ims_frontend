import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core'; // Add OnDestroy
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http'; // Import HttpClient
import { environment } from '../../../../environments/environment'; // Import environment for API URL
import {
  WebsiteContent,
  HomeContent,
  AboutContent,
  FeaturesMainContent,
  FeatureCard
} from '../../../models/content'; // Import new interfaces

@Component({
  selector: 'app-admin-pagecontent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-pagecontent.component.html',
  styleUrl: './admin-pagecontent.component.css'
})
export class AdminPagecontentComponent implements OnInit, OnDestroy {

  activeTab: 'home' | 'about' | 'features' = 'home';
  isLoading = false; // Loading state for better UX
  isSaving = false; // Saving state for better UX
  savingField = ''; // Track which field is currently being saved
  fieldSaveStatus: { [key: string]: 'saving' | 'success' | 'error' | '' } = {}; // Track save status per field

  // Content data model (initialized with empty or default structure)
  contentData: WebsiteContent = {
    home: { title: "", subtitle: "", btn1_text: "", btn2_text: "" },
    about: { title: "", description: "" },
    features: {
      main: { title: "", subtitle: "" },
      cards: []
    }
  };

  // Files for upload (store File objects, not just URLs)
  homeBgImageFile?: File;
  aboutImageFile?: File;
  featureIconFiles: (File | undefined)[] = []; // Array to hold files for each feature card

  // Image previews (URLs for display)
  homeBgImagePreview?: string;
  aboutImagePreview?: string;
  featureIconsPreview: string[] = [];

  showSaveSuccess = false; // Toast for save operation
  toastMessage = ''; // Dynamic toast message
  toastType: 'success' | 'error' | 'info' = 'success'; // Toast type

  constructor(private http: HttpClient) { } // Inject HttpClient

  // --- Toast Methods ---
  showToast(message: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000): void {
    this.toastMessage = message;
    this.toastType = type;
    this.showSaveSuccess = true;
    
    setTimeout(() => {
      this.showSaveSuccess = false;
      this.toastMessage = '';
    }, duration);
  }

  ngOnInit(): void {
    this.loadContent(); // Load existing content when component initializes
  }

  ngOnDestroy(): void {
    // Clear all timeouts to prevent memory leaks
    Object.values(this.autoSaveTimeouts).forEach(timeout => {
      if (timeout) clearTimeout(timeout);
    });
  }

  // --- Data Loading from Backend ---
  loadContent(): void {
    this.isLoading = true;
    console.log('Loading content from backend...');
    // Load Home Content - Fixed API endpoint
    this.http.get<HomeContent>(`${environment.apiUrl}/contenthome/content-home`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.contentData.home = {
            title: data.title || '',
            subtitle: data.subtitle || '',
            btn1_text: data.btn1_text || '',
            btn2_text: data.btn2_text || ''
          };
          this.homeBgImagePreview = data.bg_image_url; // Use URL for preview
          console.log('Home content loaded successfully:', data);
        },
        error: (err) => {
          console.error('Failed to load home content:', err);
          // Set default values if no content exists
          this.contentData.home = {
            title: '',
            subtitle: '',
            btn1_text: '',
            btn2_text: ''
          };
        }
      });

    // Load About Content - Fixed API endpoint
    this.http.get<AboutContent>(`${environment.apiUrl}/contentabout/content-about`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.contentData.about = {
            title: data.title || '',
            description: data.description || ''
          };
          this.aboutImagePreview = data.image_url; // Use URL for preview
          console.log('About content loaded successfully:', data);
        },
        error: (err) => {
          console.error('Failed to load about content:', err);
          // Set default values if no content exists
          this.contentData.about = {
            title: '',
            description: ''
          };
        }
      });

    // Load Features Main Content - Fixed API endpoint
    this.http.get<FeaturesMainContent>(`${environment.apiUrl}/feature/content-features`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.contentData.features.main = {
            title: data.title || '',
            subtitle: data.subtitle || ''
          };
          console.log('Features main content loaded successfully:', data);
        },
        error: (err) => {
          console.error('Failed to load features main content:', err);
          // Set default values if no content exists
          this.contentData.features.main = {
            title: '',
            subtitle: ''
          };
        }
      });

    // Initialize feature cards if empty (for demo purposes)
    if (this.contentData.features.cards.length === 0) {
      this.contentData.features.cards = [
        { title: 'Feature 1', description: 'Description for feature 1' },
        { title: 'Feature 2', description: 'Description for feature 2' },
        { title: 'Feature 3', description: 'Description for feature 3' }
      ];
      // Initialize corresponding arrays for files and previews
      this.featureIconFiles = new Array(this.contentData.features.cards.length).fill(undefined);
      this.featureIconsPreview = new Array(this.contentData.features.cards.length).fill('');
    }

    // Set loading to false after all requests complete (success or error)
    setTimeout(() => {
      this.isLoading = false;
      console.log('Content loading completed');
    }, 1000);
  }

  // --- Image Change Handlers ---
  onHomeBgImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.homeBgImageFile = input.files[0]; // Store the File object
      const reader = new FileReader();
      reader.onload = (e) => {
        this.homeBgImagePreview = e.target?.result as string; // For immediate preview
      };
      reader.readAsDataURL(this.homeBgImageFile);
    } else {
      this.homeBgImageFile = undefined;
      this.homeBgImagePreview = undefined; // Clear preview if no file selected
    }
  }

  onAboutImageChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.aboutImageFile = input.files[0]; // Store the File object
      const reader = new FileReader();
      reader.onload = (e) => {
        this.aboutImagePreview = e.target?.result as string; // For immediate preview
      };
      reader.readAsDataURL(this.aboutImageFile);
    } else {
      this.aboutImageFile = undefined;
      this.aboutImagePreview = undefined; // Clear preview
    }
  }

  onFeatureIconChange(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.featureIconFiles[index] = input.files[0]; // Store the File object
      const reader = new FileReader();
      reader.onload = (e) => {
        this.featureIconsPreview[index] = e.target?.result as string; // For immediate preview
      };
      reader.readAsDataURL(this.featureIconFiles[index]!);
    } else {
      this.featureIconFiles[index] = undefined;
      this.featureIconsPreview[index] = ''; // Clear preview
    }
  }

  // --- Feature Card Management (Local for now, needs backend for persistence) ---
  addFeatureCard(): void {
    this.contentData.features.cards.push({
      title: 'New Feature',
      description: 'Feature description goes here'
    });
    this.featureIconFiles.push(undefined); // Add a placeholder for its file
    this.featureIconsPreview.push(''); // Add a placeholder for its preview
  }

  removeFeatureCard(index: number): void {
    if (confirm('Are you sure you want to remove this feature card?')) {
      this.contentData.features.cards.splice(index, 1);
      this.featureIconFiles.splice(index, 1);
      this.featureIconsPreview.splice(index, 1);
      // TODO: If cards had IDs, you'd send a DELETE request to backend here
    }
  }

  // --- Individual Field Update Methods ---
  async updateHomeField(fieldName: 'title' | 'subtitle' | 'btn1_text' | 'btn2_text'): Promise<void> {
    const fieldKey = `home_${fieldName}`;
    this.fieldSaveStatus[fieldKey] = 'saving';
    
    try {
      const formData = new FormData();
      formData.append(fieldName, this.contentData.home[fieldName]);
      
      const response = await this.http.post(`${environment.apiUrl}/contenthome/content-home`, formData, { withCredentials: true }).toPromise();
      
      this.fieldSaveStatus[fieldKey] = 'success';
      this.showToast(`Home ${fieldName.replace('_', ' ')} saved successfully!`, 'success', 2000);
      console.log(`Home ${fieldName} updated successfully:`, response);
      
      // Clear success status after 2 seconds
      setTimeout(() => this.fieldSaveStatus[fieldKey] = '', 2000);
    } catch (error) {
      this.fieldSaveStatus[fieldKey] = 'error';
      this.showToast(`Failed to save home ${fieldName.replace('_', ' ')}`, 'error', 3000);
      console.error(`Error updating home ${fieldName}:`, error);
      
      // Clear error status after 3 seconds
      setTimeout(() => this.fieldSaveStatus[fieldKey] = '', 3000);
    }
  }

  async updateAboutField(fieldName: 'title' | 'description'): Promise<void> {
    const fieldKey = `about_${fieldName}`;
    this.fieldSaveStatus[fieldKey] = 'saving';
    
    try {
      const formData = new FormData();
      formData.append(fieldName, this.contentData.about[fieldName]);
      
      const response = await this.http.post(`${environment.apiUrl}/contentabout/content-about`, formData, { withCredentials: true }).toPromise();
      
      this.fieldSaveStatus[fieldKey] = 'success';
      this.showToast(`About ${fieldName} saved successfully!`, 'success', 2000);
      console.log(`About ${fieldName} updated successfully:`, response);
      
      // Clear success status after 2 seconds
      setTimeout(() => this.fieldSaveStatus[fieldKey] = '', 2000);
    } catch (error) {
      this.fieldSaveStatus[fieldKey] = 'error';
      this.showToast(`Failed to save about ${fieldName}`, 'error', 3000);
      console.error(`Error updating about ${fieldName}:`, error);
      
      // Clear error status after 3 seconds
      setTimeout(() => this.fieldSaveStatus[fieldKey] = '', 3000);
    }
  }

  async updateFeaturesField(fieldName: 'title' | 'subtitle'): Promise<void> {
    const fieldKey = `features_${fieldName}`;
    this.fieldSaveStatus[fieldKey] = 'saving';
    
    try {
      const payload = {
        [fieldName]: this.contentData.features.main[fieldName]
      };
      
      const response = await this.http.post(`${environment.apiUrl}/feature/content-features`, payload, { withCredentials: true }).toPromise();
      
      this.fieldSaveStatus[fieldKey] = 'success';
      this.showToast(`Features ${fieldName} saved successfully!`, 'success', 2000);
      console.log(`Features ${fieldName} updated successfully:`, response);
      
      // Clear success status after 2 seconds
      setTimeout(() => this.fieldSaveStatus[fieldKey] = '', 2000);
    } catch (error) {
      this.fieldSaveStatus[fieldKey] = 'error';
      this.showToast(`Failed to save features ${fieldName}`, 'error', 3000);
      console.error(`Error updating features ${fieldName}:`, error);
      
      // Clear error status after 3 seconds
      setTimeout(() => this.fieldSaveStatus[fieldKey] = '', 3000);
    }
  }

  // --- Image Update Methods ---
  async updateHomeImage(): Promise<void> {
    if (!this.homeBgImageFile) {
      this.showToast('Please select an image first', 'error', 2000);
      return;
    }

    const fieldKey = 'home_image';
    this.fieldSaveStatus[fieldKey] = 'saving';
    
    try {
      const formData = new FormData();
      formData.append('bg_image', this.homeBgImageFile, this.homeBgImageFile.name);
      
      const response = await this.http.post(`${environment.apiUrl}/contenthome/content-home`, formData, { withCredentials: true }).toPromise();
      
      this.fieldSaveStatus[fieldKey] = 'success';
      this.showToast('Home background image updated successfully!', 'success', 2000);
      console.log('Home image updated successfully:', response);
      
      // Clear the file after successful upload
      this.homeBgImageFile = undefined;
      
      // Reload to get the new image URL
      this.loadHomeContent();
      
      // Clear success status after 2 seconds
      setTimeout(() => this.fieldSaveStatus[fieldKey] = '', 2000);
    } catch (error) {
      this.fieldSaveStatus[fieldKey] = 'error';
      this.showToast('Failed to upload home background image', 'error', 3000);
      console.error('Error updating home image:', error);
      
      // Clear error status after 3 seconds
      setTimeout(() => this.fieldSaveStatus[fieldKey] = '', 3000);
    }
  }

  async updateAboutImage(): Promise<void> {
    if (!this.aboutImageFile) {
      this.showToast('Please select an image first', 'error', 2000);
      return;
    }

    const fieldKey = 'about_image';
    this.fieldSaveStatus[fieldKey] = 'saving';
    
    try {
      const formData = new FormData();
      formData.append('image', this.aboutImageFile, this.aboutImageFile.name);
      
      const response = await this.http.post(`${environment.apiUrl}/contentabout/content-about`, formData, { withCredentials: true }).toPromise();
      
      this.fieldSaveStatus[fieldKey] = 'success';
      this.showToast('About image updated successfully!', 'success', 2000);
      console.log('About image updated successfully:', response);
      
      // Clear the file after successful upload
      this.aboutImageFile = undefined;
      
      // Reload to get the new image URL
      this.loadAboutContent();
      
      // Clear success status after 2 seconds
      setTimeout(() => this.fieldSaveStatus[fieldKey] = '', 2000);
    } catch (error) {
      this.fieldSaveStatus[fieldKey] = 'error';
      this.showToast('Failed to upload about image', 'error', 3000);
      console.error('Error updating about image:', error);
      
      // Clear error status after 3 seconds
      setTimeout(() => this.fieldSaveStatus[fieldKey] = '', 3000);
    }
  }

  // --- Helper Methods for Loading Individual Content ---
  private loadHomeContent(): void {
    this.http.get<HomeContent>(`${environment.apiUrl}/contenthome/content-home`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.contentData.home = {
            title: data.title || '',
            subtitle: data.subtitle || '',
            btn1_text: data.btn1_text || '',
            btn2_text: data.btn2_text || ''
          };
          this.homeBgImagePreview = data.bg_image_url;
        },
        error: (err) => console.error('Failed to reload home content:', err)
      });
  }

  private loadAboutContent(): void {
    this.http.get<AboutContent>(`${environment.apiUrl}/contentabout/content-about`, { withCredentials: true })
      .subscribe({
        next: (data) => {
          this.contentData.about = {
            title: data.title || '',
            description: data.description || ''
          };
          this.aboutImagePreview = data.image_url;
        },
        error: (err) => console.error('Failed to reload about content:', err)
      });
  }

  // --- Utility Methods for Field Status ---
  getFieldStatus(fieldKey: string): string {
    return this.fieldSaveStatus[fieldKey] || '';
  }

  isFieldSaving(fieldKey: string): boolean {
    return this.fieldSaveStatus[fieldKey] === 'saving';
  }

  isFieldSuccess(fieldKey: string): boolean {
    return this.fieldSaveStatus[fieldKey] === 'success';
  }

  isFieldError(fieldKey: string): boolean {
    return this.fieldSaveStatus[fieldKey] === 'error';
  }

  // --- Keyboard Event Handlers ---
  onFieldKeyPress(event: KeyboardEvent, section: 'home' | 'about' | 'features', fieldName: string): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      switch (section) {
        case 'home':
          this.updateHomeField(fieldName as 'title' | 'subtitle' | 'btn1_text' | 'btn2_text');
          break;
        case 'about':
          this.updateAboutField(fieldName as 'title' | 'description');
          break;
        case 'features':
          this.updateFeaturesField(fieldName as 'title' | 'subtitle');
          break;
      }
    }
  }

  // --- Auto-save functionality (optional) ---
  private autoSaveTimeouts: { [key: string]: any } = {};

  onFieldInput(section: 'home' | 'about' | 'features', fieldName: string): void {
    const fieldKey = `${section}_${fieldName}`;
    
    // Clear existing timeout
    if (this.autoSaveTimeouts[fieldKey]) {
      clearTimeout(this.autoSaveTimeouts[fieldKey]);
    }
    
    // Set new timeout for auto-save after 2 seconds of no typing
    this.autoSaveTimeouts[fieldKey] = setTimeout(() => {
      switch (section) {
        case 'home':
          this.updateHomeField(fieldName as 'title' | 'subtitle' | 'btn1_text' | 'btn2_text');
          break;
        case 'about':
          this.updateAboutField(fieldName as 'title' | 'description');
          break;
        case 'features':
          this.updateFeaturesField(fieldName as 'title' | 'subtitle');
          break;
      }
    }, 2000);
  }

  // --- Saving Changes to Backend ---
  saveChanges(): void {
    if (confirm('Are you sure you want to save these changes?')) {
      this.isSaving = true;
      console.log('Starting save process...');
      
      // Save all content sections
      Promise.all([
        this.saveHomePageContent(),
        this.saveAboutUsContent(),
        this.saveFeaturesMainContent()
      ]).then(() => {
        console.log('All content saved successfully');
        this.showSaveSuccess = true;
        setTimeout(() => this.showSaveSuccess = false, 3000);
        // Reload content to get updated data from backend
        this.loadContent();
      }).catch((error) => {
        console.error('Error saving content:', error);
        alert('Error saving content. Please check the console for details.');
      }).finally(() => {
        this.isSaving = false;
      });
    }
  }

  private saveHomePageContent(): Promise<any> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('title', this.contentData.home.title);
      formData.append('subtitle', this.contentData.home.subtitle);
      formData.append('btn1_text', this.contentData.home.btn1_text);
      formData.append('btn2_text', this.contentData.home.btn2_text);
      
      if (this.homeBgImageFile) {
        formData.append('bg_image', this.homeBgImageFile, this.homeBgImageFile.name);
      }

      this.http.post(`${environment.apiUrl}/contenthome/content-home`, formData, { withCredentials: true })
        .subscribe({
          next: (response: any) => {
            console.log('Home content saved:', response.message);
            resolve(response);
          },
          error: (err) => {
            console.error('Error saving home content:', err);
            reject(err);
          }
        });
    });
  }

  private saveAboutUsContent(): Promise<any> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('title', this.contentData.about.title);
      formData.append('description', this.contentData.about.description);
      
      if (this.aboutImageFile) {
        formData.append('image', this.aboutImageFile, this.aboutImageFile.name);
      }

      this.http.post(`${environment.apiUrl}/contentabout/content-about`, formData, { withCredentials: true })
        .subscribe({
          next: (response: any) => {
            console.log('About content saved:', response.message);
            resolve(response);
          },
          error: (err) => {
            console.error('Error saving about content:', err);
            reject(err);
          }
        });
    });
  }

  private saveFeaturesMainContent(): Promise<any> {
    return new Promise((resolve, reject) => {
      // No file upload for main features title/subtitle
      const payload: FeaturesMainContent = {
        title: this.contentData.features.main.title,
        subtitle: this.contentData.features.main.subtitle
      };

      this.http.post(`${environment.apiUrl}/feature/content-features`, payload, { withCredentials: true })
        .subscribe({
          next: (response: any) => {
            console.log('Features main content saved:', response.message);
            resolve(response);
          },
          error: (err) => {
            console.error('Error saving features main content:', err);
            reject(err);
          }
        });
    });
  }

  // TODO: Add methods to save individual feature cards if they are separate entities
  // private saveFeatureCard(card: FeatureCard, index: number): void {
  //   const formData = new FormData();
  //   formData.append('title', card.title);
  //   formData.append('description', card.description);
  //   if (this.featureIconFiles[index]) {
  //     formData.append('icon_image', this.featureIconFiles[index]!, this.featureIconFiles[index]!.name);
  //   } else if (card.icon_image === null) {
  //       formData.append('icon_image', 'REMOVE_IMAGE');
  //   }
  //   // Determine if creating new or updating existing
  //   if (card.id) {
  //     this.http.put(`${environment.apiUrl}/feature-cards/${card.id}`, formData, { withCredentials: true }).subscribe(...)
  //   } else {
  //     this.http.post(`${environment.apiUrl}/feature-cards`, formData, { withCredentials: true }).subscribe(...)
  //   }
  // }

  showTab(tab: 'home' | 'about' | 'features'): void {
    this.activeTab = tab;
  }

  // --- Utility Methods ---
  refreshContent(): void {
    if (confirm('This will reload all content from the database and discard unsaved changes. Continue?')) {
      this.loadContent();
    }
  }

  // Check if there's any file ready to upload
  hasUnsavedFiles(): boolean {
    return !!(this.homeBgImageFile || this.aboutImageFile || this.featureIconFiles.some(file => file));
  }

  // Clear all selected files
  clearAllFiles(): void {
    if (confirm('Clear all selected files?')) {
      this.homeBgImageFile = undefined;
      this.aboutImageFile = undefined;
      this.featureIconFiles = new Array(this.contentData.features.cards.length).fill(undefined);
      this.homeBgImagePreview = undefined;
      this.aboutImagePreview = undefined;
      this.featureIconsPreview = new Array(this.contentData.features.cards.length).fill('');
    }
  }
}
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./profile.module.css";

export default function Profile() {
  const [displayName, setDisplayName] = useState<string>('');
  const [flagPreview, setFlagPreview] = useState<string>(''); // Permanent flag URL from DB
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [goldMedals, setGoldMedals] = useState<number>(0);
  const [overallStandings, setOverallStandings] = useState<number>(0);
  const [bettingAmount, setBettingAmount] = useState<number>(0);
  const [settingsVisible, setSettingsVisible] = useState<boolean>(false);
  const [photoUploadVisible, setPhotoUploadVisible] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  
  // State for preview modal for photos
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  // State for admin role
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          console.log("Profile data:", data); // Verify role is returned here
          setDisplayName(data.displayName || '');
          setFlagPreview(data.flag || '');
          setGoldMedals(data.goldMedals || 3);
          setOverallStandings(data.overallStandings || 1);
          setBettingAmount(data.bettingAmount ?? 50);
          // Set admin status based on returned role (case-insensitive)
          if (data.role && data.role.toLowerCase() === "admin") {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } else {
          setMessage("Failed to load profile");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setMessage("Error fetching profile");
      }
    };

    const fetchPhotos = async () => {
      try {
        const res = await fetch("/api/photos");
        if (res.ok) {
          const photos = await res.json();
          setUploadedPhotos(photos);
        }
      } catch (error) {
        console.error("Error fetching photos:", error);
      }
    };

    fetchProfile();
    fetchPhotos();
  }, []);

  const handleFlagChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFlagPreview(URL.createObjectURL(file));
      const formData = new FormData();
      formData.append("flag", file);
      try {
        setUploading(true);
        const res = await fetch("/api/upload/flag", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          setFlagPreview(data.filePath);
          setMessage("Flag uploaded successfully.");
          setSettingsVisible(false);
        } else {
          setMessage(data.message || "Flag upload failed.");
        }
      } catch (error) {
        console.error("Error uploading flag:", error);
        setMessage("Error uploading flag.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handleProfileSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, flag: flagPreview }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Profile updated successfully.");
        setSettingsVisible(false);
      } else {
        setMessage(data.message || "Profile update failed.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Error updating profile.");
    }
  };

  const toggleSettings = () => {
    setSettingsVisible(!settingsVisible);
  };

  const togglePhotoUpload = () => {
    setPhotoUploadVisible(!photoUploadVisible);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedPhoto(e.target.files[0]);
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedPhoto) return;
    const formData = new FormData();
    formData.append("photo", selectedPhoto);
    try {
      setUploading(true);
      const res = await fetch("/api/upload/explore", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadedPhotos([...uploadedPhotos, data.filePath]);
        setMessage("Photo uploaded successfully.");
        setPhotoUploadVisible(false);
      } else {
        setMessage(data.message || "Photo upload failed.");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      setMessage("Error uploading photo.");
    } finally {
      setUploading(false);
    }
  };

  const openPreview = (photoUrl: string) => {
    setPreviewPhoto(photoUrl);
  };

  const closePreview = () => {
    setPreviewPhoto(null);
  };

  return (
    <div className={styles.profileContainer}>
      {/* Banner Section */}
      <div
        className={styles.banner}
        style={{ backgroundImage: `url(${flagPreview})` }}
      >
        {displayName && (
          <div className={styles.nameBanner}>
            <h2>{displayName}</h2>
          </div>
        )}
        <div className={styles.bannerOverlay}>
          <div className={styles.info}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Gold Medals</span>
              <span className={styles.infoValue}>{goldMedals}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Standings</span>
              <span className={styles.infoValue}>{overallStandings}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Betting</span>
              <span className={styles.infoValue}>${bettingAmount}</span>
            </div>
          </div>
          <div className={styles.settingsIcon} onClick={toggleSettings}>
            <img
              src="/icons/setting-icon.png"
              alt="Settings"
              className={styles.gearIcon}
            />
          </div>
        </div>
      </div>

      {/* Admin Dashboard Link: Placed right under the banner */}
      {isAdmin && (
        <div className={styles.adminLinkContainer}>
          <a href="/admin-dashboard" className={styles.adminLink}>
            Admin Dashboard
          </a>
        </div>
      )}

      {/* Profile Content */}
      <div className={styles.profileContent}>
        {settingsVisible && (
          <div className={styles.settingsPanel}>
            <div className={styles.inputGroup}>
              <label htmlFor="flag">Change Flag Image:</label>
              <input
                id="flag"
                type="file"
                accept="image/*"
                onChange={handleFlagChange}
              />
            </div>
            <button onClick={handleProfileSave} className={styles.saveButton}>
              Save Profile
            </button>
          </div>
        )}
      </div>

      {/* Photos Section */}
      <div className={styles.photosSection}>
        <div className={styles.photosHeader}>
          <h2 className={styles.photosHeading}>Photos</h2>
          <button onClick={togglePhotoUpload} className={styles.addPhotoButton}>
            +
          </button>
        </div>
        <hr className={styles.photosDivider} />
        {photoUploadVisible && (
          <div className={styles.photoUploadPanel}>
            <input type="file" accept="image/*" onChange={handlePhotoChange} />
            <button onClick={handlePhotoUpload} className={styles.uploadPhotoButton}>
              Upload Photo
            </button>
          </div>
        )}
        <div className={styles.uploadedPhotos}>
          {uploadedPhotos.length > 0 ? (
            uploadedPhotos.map((photoUrl, index) => (
              <img
                key={index}
                src={photoUrl}
                alt={`Uploaded ${index}`}
                className={styles.uploadedPhoto}
                onClick={() => openPreview(photoUrl)}
              />
            ))
          ) : (
            <p>No photos uploaded yet.</p>
          )}
        </div>
      </div>

      {message && <p className={styles.message}>{message}</p>}

      {/* Modal for Photo Preview */}
      {previewPhoto && (
        <div className={styles.modalOverlay} onClick={closePreview}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <img src={previewPhoto} alt="Preview" className={styles.modalImage} />
            <button onClick={closePreview} className={styles.closeModalButton}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

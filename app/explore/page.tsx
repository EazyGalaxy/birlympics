"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './explore.module.css';

interface PhotoItem {
  image_path: string;
  user_flag: string;
  username: string;
  upload_time: string;
}

export default function Explore() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [newPhotosCount, setNewPhotosCount] = useState<number>(0);
  const initialFetch = useRef(false); // Prevent duplicate initial fetch

  const observer = useRef<IntersectionObserver | null>(null);

  const lastPhotoElementRef = useCallback((node: HTMLElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        fetchPhotos();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, photos]);

  useEffect(() => {
    if (!initialFetch.current) {
      initialFetch.current = true;
      // On initial load, if no "lastExploreVisit" is set, store the current time
      const lastVisit = localStorage.getItem("lastExploreVisit");
      if (!lastVisit) {
        localStorage.setItem("lastExploreVisit", new Date().toISOString());
      }
      fetchPhotos();
    }
  }, []);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/explore/all-photos?offset=${photos.length}`);
      if (res.ok) {
        const data = await res.json(); // data = { photos: PhotoItem[], hasMore: boolean }
        // Append only new photos (filtering duplicates)
        const newPhotos = data.photos.filter((p: PhotoItem) =>
          !photos.some(photo => photo.image_path === p.image_path)
        );
        setPhotos(prev => [...prev, ...newPhotos]);
        setHasMore(data.hasMore);
        // Compute new photos count by comparing upload_time with lastExploreVisit
        const lastVisit = localStorage.getItem("lastExploreVisit") || new Date(0).toISOString();
        const count = newPhotos.filter((p: PhotoItem) => new Date(p.upload_time) > new Date(lastVisit)).length;
        setNewPhotosCount(prev => prev + count);
      }
    } catch (error) {
      console.error("Error fetching photos:", error);
    }
    setLoading(false);
  };

  // Update lastExploreVisit timestamp when component unmounts
  useEffect(() => {
    return () => {
      localStorage.setItem("lastExploreVisit", new Date().toISOString());
    };
  }, []);

  return (
    <div className={styles.exploreContainer} suppressHydrationWarning>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Explore</h1>
        <p className={styles.newPhotosLabel}>
          {newPhotosCount} new photos since last login
        </p>
      </header>
      <div className={styles.postsContainer}>
        {photos.map((photo, index) => {
          const post = (
            <div key={index} className={styles.post}>
              <div className={styles.postHeader}>
                <img src={photo.user_flag} alt="User flag" className={styles.userFlag} />
                <span className={styles.username}>{photo.username}</span>
              </div>
              <img src={photo.image_path} alt={`Photo ${index}`} className={styles.postImage} />
            </div>
          );
          if (index === photos.length - 1) {
            return <div ref={lastPhotoElementRef} key={index}>{post}</div>;
          } else {
            return post;
          }
        })}
      </div>
      {loading && <p className={styles.loadingText}>Loading more posts...</p>}
    </div>
  );
}

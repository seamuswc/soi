// Domain-specific configuration
export const getDomainConfig = () => {
  const hostname = window.location.hostname;
  
  if (hostname.includes('soibkk.com')) {
    return {
      center: {
        lat: 13.7563, // Bangkok center
        lng: 100.5018
      },
      placeholder: "e.g., 13.7563, 100.5018",
      cityName: "Bangkok",
      siteName: "soiBkk"
    };
  } else {
    // Default to Pattaya
    return {
      center: {
        lat: 12.9236, // Pattaya center
        lng: 100.8825
      },
      placeholder: "e.g., 12.9236, 100.8825",
      cityName: "Pattaya",
      siteName: "soiPattaya"
    };
  }
};

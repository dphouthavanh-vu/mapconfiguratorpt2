'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CategoryFilterPanelProps {
  categories: string[];
  selectedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  visible: boolean;
}

export default function CategoryFilterPanel({
  categories,
  selectedCategories,
  onToggleCategory,
  onSelectAll,
  onClearAll,
  visible,
}: CategoryFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Add custom scrollbar styles
  useEffect(() => {
    const styleId = 'category-filter-scrollbar-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .category-filter-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .category-filter-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .category-filter-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .category-filter-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  if (!visible || categories.length === 0) return null;

  const allSelected = selectedCategories.size === categories.length;
  const noneSelected = selectedCategories.size === 0;

  return (
    <div
      style={{
        position: 'fixed',
        left: '32px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 20,
      }}
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          padding: isExpanded ? '16px' : '12px',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          minWidth: isExpanded ? '240px' : 'auto',
          maxHeight: '80vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <motion.button
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '9999px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
            }}
          >
            <Filter size={16} strokeWidth={2.5} />
            {isExpanded && <span>Filter Categories</span>}
          </motion.button>
        </div>

        {/* Category List */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                maxHeight: 'calc(80vh - 100px)',
                overflow: 'hidden',
                width: '100%',
              }}
            >
              {/* Quick Actions */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  marginBottom: '12px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <motion.button
                  onClick={onSelectAll}
                  disabled={allSelected}
                  whileHover={{ scale: allSelected ? 1 : 1.02 }}
                  whileTap={{ scale: allSelected ? 1 : 0.98 }}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    backgroundColor: allSelected
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    color: allSelected ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: allSelected ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Select All
                </motion.button>
                <motion.button
                  onClick={onClearAll}
                  disabled={noneSelected}
                  whileHover={{ scale: noneSelected ? 1 : 1.02 }}
                  whileTap={{ scale: noneSelected ? 1 : 0.98 }}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    backgroundColor: noneSelected
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    color: noneSelected ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: noneSelected ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Clear All
                </motion.button>
              </div>

              {/* Categories */}
              <div
                className="category-filter-scroll"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  paddingRight: '4px',
                  maxHeight: '100%',
                }}
              >
                {categories.map((category) => {
                  const isSelected = selectedCategories.has(category);
                  return (
                    <motion.button
                      key={category}
                      onClick={() => onToggleCategory(category)}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        padding: '10px 12px',
                        backgroundColor: isSelected
                          ? 'rgba(59, 130, 246, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                        border: isSelected
                          ? '1px solid rgba(59, 130, 246, 0.4)'
                          : '1px solid transparent',
                        borderRadius: '8px',
                        color: isSelected ? 'rgba(147, 197, 253, 1)' : 'rgba(255, 255, 255, 0.8)',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }
                      }}
                    >
                      <span style={{ flex: 1 }}>{category}</span>
                      {isSelected && (
                        <Check size={14} strokeWidth={3} style={{ flexShrink: 0 }} />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filtered Count Badge */}
        {!isExpanded && selectedCategories.size < categories.length && selectedCategories.size > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.9)',
              color: 'white',
              fontSize: '10px',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: '9999px',
              minWidth: '18px',
              textAlign: 'center',
            }}
          >
            {selectedCategories.size}
          </div>
        )}
      </motion.div>
    </div>
  );
}

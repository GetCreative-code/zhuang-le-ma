import os
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'zhuang_le_ma.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Software(Base):
    __tablename__ = "software"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), unique=True, nullable=False, index=True)
    display_name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    versions = relationship("SoftwareVersion", back_populates="software", cascade="all, delete-orphan")
    guides = relationship("InstallGuide", back_populates="software", cascade="all, delete-orphan")


class SoftwareVersion(Base):
    __tablename__ = "software_versions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    software_id = Column(Integer, ForeignKey("software.id"), nullable=False)
    version = Column(String(100), nullable=False)
    platform = Column(String(50), nullable=False, default="all")
    is_stable = Column(Boolean, default=True)
    release_date = Column(String(50), nullable=True)
    source = Column(String(50), default="ai")
    software = relationship("Software", back_populates="versions")


class InstallGuide(Base):
    __tablename__ = "install_guides"
    id = Column(Integer, primary_key=True, autoincrement=True)
    software_id = Column(Integer, ForeignKey("software.id"), nullable=False)
    version = Column(String(100), nullable=False)
    platform = Column(String(50), nullable=False)
    markdown_content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    software = relationship("Software", back_populates="guides")


class Feedback(Base):
    __tablename__ = "feedback"
    id = Column(Integer, primary_key=True, autoincrement=True)
    guide_id = Column(Integer, ForeignKey("install_guides.id"), nullable=True)
    software_name = Column(String(200), nullable=False)
    version = Column(String(100), nullable=False)
    platform = Column(String(50), nullable=False)
    is_helpful = Column(Boolean, nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed = Column(Boolean, default=False)


class SelectionStat(Base):
    __tablename__ = "selection_stats"
    id = Column(Integer, primary_key=True, autoincrement=True)
    software_name = Column(String(200), nullable=False)
    version = Column(String(100), nullable=False)
    platform = Column(String(50), nullable=False)
    count = Column(Integer, default=1)
    last_selected = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)

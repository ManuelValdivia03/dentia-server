using Dentia.Appointments.Api.Domain.Entities;
using Dentia.Appointments.Api.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Dentia.Appointments.Api.Infrastructure.Persistence;

public class AppointmentsDbContext : DbContext
{
    public AppointmentsDbContext(DbContextOptions<AppointmentsDbContext> options)
        : base(options)
    {
    }

    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<AppointmentRating> AppointmentRatings => Set<AppointmentRating>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresEnum<AppointmentStatus>("public", "appointments_status_enum");

        modelBuilder.Entity<Appointment>(entity =>
        {
            entity.ToTable("appointments");

            entity.HasKey(x => x.Id);

            entity.Property(x => x.Id)
                .HasColumnName("id")
                .HasColumnType("uuid");

            entity.Property(x => x.PatientId)
                .HasColumnName("patientId")
                .IsRequired();

            entity.Property(x => x.DentistId)
                .HasColumnName("dentistId")
                .IsRequired();

            entity.Property(x => x.StartAt)
                .HasColumnName("startAt")
                .HasColumnType("timestamp without time zone")
                .IsRequired();

            entity.Property(x => x.EndAt)
                .HasColumnName("endAt")
                .HasColumnType("timestamp without time zone")
                .IsRequired();

            entity.Property(x => x.Status)
                .HasColumnName("status")
                .HasColumnType("appointments_status_enum")
                .IsRequired();

            entity.Property(x => x.Reason)
                .HasColumnName("reason")
                .HasMaxLength(255);

            entity.Property(x => x.Notes)
                .HasColumnName("notes")
                .HasColumnType("text");

            entity.Property(x => x.CreatedAt)
                .HasColumnName("createdAt")
                .HasColumnType("timestamp without time zone");

            entity.Property(x => x.UpdatedAt)
                .HasColumnName("updatedAt")
                .HasColumnType("timestamp without time zone");
        });

        modelBuilder.Entity<AppointmentRating>(entity =>
        {
            entity.ToTable("appointment_ratings");

            entity.HasKey(x => x.Id);

            entity.Property(x => x.Id)
                .HasColumnName("id")
                .HasColumnType("uuid");

            entity.Property(x => x.AppointmentId)
                .HasColumnName("appointmentId")
                .HasColumnType("uuid")
                .IsRequired();

            entity.Property(x => x.PatientId)
                .HasColumnName("patientId")
                .IsRequired();

            entity.Property(x => x.DentistId)
                .HasColumnName("dentistId")
                .IsRequired();

            entity.Property(x => x.Score)
                .HasColumnName("score")
                .IsRequired();

            entity.Property(x => x.Comment)
                .HasColumnName("comment")
                .HasColumnType("text");

            entity.Property(x => x.CreatedAt)
                .HasColumnName("createdAt")
                .HasColumnType("timestamp without time zone");

            entity.Property(x => x.UpdatedAt)
                .HasColumnName("updatedAt")
                .HasColumnType("timestamp without time zone");

            entity.HasIndex(x => x.AppointmentId)
                .IsUnique();

            entity.HasIndex(x => x.DentistId);
        });
    }
}
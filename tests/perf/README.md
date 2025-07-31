

## Testing Machine Prepartion
### Prerequisites
- You must have **root access**.
- It's better to use **Intel** CPUs.
- Tested on Ubuntu/Pop!_OS-based distros with **systemd** and **GRUB or kernelstub**.

### Identify Physical CPU Cores

You need to identify physical **P-cores** (performance cores) and exclude E-cores (efficient) and virtual SMT threads.

To print physical cores only:
```bash
lscpu | grep 'Core(s) per socket\|Socket(s)\|Thread(s) per core'
grep ^processor /proc/cpuinfo
```

### Edit Kernel Boot Parameters

Add the following to GRUB or kernelstub to isolate testing cores and disable interrupts on them (replace `2-15` with your cores that need to be removed from the scheduler):

```
isolcpus=2-15 nohz_full=2-15 rcu_nocbs=2-15 \
intel_pstate=disable processor.max_cstate=1 idle=poll \
nosoftlockup nmi_watchdog=0 mitigations=off
```
If using GRUB:

Edit:
`sudo nano /etc/default/grub`

Update this line:

`GRUB_CMDLINE_LINUX="isolcpus=2-15 nohz_full=2-15 rcu_nocbs=2-15 ..."`

Then:
```bash
sudo update-grub
sudo reboot
```

If using kernelstub (Pop!_OS):

```bash
sudo kernelstub -a "isolcpus=2-15 nohz_full=2-15 rcu_nocbs=2-15 \
intel_pstate=disable processor.max_cstate=1 idle=poll \
nosoftlockup nmi_watchdog=0 mitigations=off"
sudo reboot
```
After reboot, check:

### Set CPU Frequency Manually
Set governor to performance (replace 2-15 with your cores):

```bash
for cpu in $(seq 2 15); do
  echo performance | sudo tee /sys/devices/system/cpu/cpu$cpu/cpufreq/scaling_governor
done
```

Or set fixed frequency:

```bash
for cpu in {2..15}; do
  echo 3400000 | sudo tee /sys/devices/system/cpu/cpu$cpu/cpufreq/scaling_max_freq
  echo 3400000 | sudo tee /sys/devices/system/cpu/cpu$cpu/cpufreq/scaling_min_freq
done
```

⚡ 4. Set IRQ Affinity (Interrupts)
Method 1: Use TUNA (recommended)

sudo apt install tuna
sudo tuna --irqs --cpus=0-1 --move

Method 2: Manual IRQ binding

    List IRQs:

cat /proc/interrupts

    Set affinity (example for IRQ 35):

echo 3 | sudo tee /proc/irq/35/smp_affinity

3 means binary 11 = CPUs 0 and 1.

Repeat for other IRQs.
🔒 5. Disable ASLR

echo 0 | sudo tee /proc/sys/kernel/randomize_va_space

Persist it:

echo 'kernel.randomize_va_space = 0' | sudo tee -a /etc/sysctl.conf

🧬 6. Disable Hyper-Threading (SMT)

Check thread siblings:

lscpu -e | grep -v '^#' | sort -k4

Disable logical threads:

for i in 1 3 5 7; do
  echo 0 | sudo tee /sys/devices/system/cpu/cpu$i/online
done

🐳 7. Docker Compose cpuset Configuration

To assign specific cores to containers, add cpuset to each service in your docker-compose-cpuset.yml:

services:
  my_service:
    cpuset: "2-15"

Repeat for all containers. Reserve cores 0–1 for the system.


## Perfkit
```bash
cd tests/perf
pip install -e .
```

Check perfkit is installed and can be used:
```bash
perfkit golden show
```


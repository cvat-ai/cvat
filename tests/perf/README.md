

## Testing Machine Preparation
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

Add the following to GRUB or kernelstub to isolate testing cores and disable
interrupts on them (replace `2-15` with your cores that need to be removed from the scheduler):

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

### Set IRQ Affinity (Interrupts)
#### Method 1: Use TUNA (recommended)
This script moves all irqs to 0-1 cores.
```bash
sudo apt install tuna
sudo tuna --irqs=* --cpus=0-1 --move
sudo tuna --show-irqs
```
#### Method 2: Manual IRQ binding
List IRQs:
```bash
cat /proc/interrupts
```
Set affinity (example for IRQ 35):
```bash
echo 3 | sudo tee /proc/irq/35/smp_affinity
```
3 means binary 11 = CPUs 0 and 1.
Repeat for other IRQs.

### Disable ASLR (Optional)

```bash
echo 0 | sudo tee /proc/sys/kernel/randomize_va_space
```
Persist it:

```bash
echo 'kernel.randomize_va_space = 0' | sudo tee -a /etc/sysctl.conf
```

### Disable Hyper-Threading (SMT)

```bash
echo off | sudo tee /sys/devices/system/cpu/smt/control
```

### Docker Compose cpuset Configuration

To assign specific cores to containers, add cpuset to each service in `docker-compose-perf-cpuset.yml`:

```yaml
services:
  my_service:
    cpuset: "2,4,6,8,10"
```
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

To record a baseline:
```bash
perfkit run-golden --runs 1 /tests/regression/tasks.js
```

To run regression test:
```bash
perfkit run-regression --commit <commit-id> /tests/regression/tasks.js
```

